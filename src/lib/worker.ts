/**
 * Worker de Processamento de Mensagens
 *
 * Responsável por:
 * 1. Buscar mensagens pendentes de todos os tenants
 * 2. Enviar via Evolution API (tenants processados em paralelo)
 * 3. Atualizar status (SENT/FAILED/DEAD_LETTER)
 * 4. Retry automático com backoff exponencial
 */

import { prisma, getTenantPrisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { decrypt } from "@/lib/encryption";
import { canonicalizePhone, findContactByPhone } from "@/lib/phone";
import { CampaignPersonalizer } from "@/services/ai/campaign-personalizer";
import { canPersonalize, recordPersonalization, applyReset, type QuotaState } from "@/services/ai/ai-quota";
import {
    MAX_RETRIES,
    eligibleForSendWhere,
    unfinishedMessagesWhere,
    applyOutcome,
    calculateDelay,
} from "@/lib/campaign-message-lifecycle";
import { encodeOutboundAudit } from "@/lib/chat-envelope";

const MAX_CONCURRENT_TENANTS = 5;
const MESSAGES_PER_BATCH = 20;

// Instância única do personalizador de IA (stateless)
const aiPersonalizer = new CampaignPersonalizer();

export interface WorkerResult {
    processed: number;
    sent: number;
    failed: number;
    deadLettered: number;
    retried: number;
    errors: string[];
}

/**
 * Processa mensagens pendentes de um tenant específico
 */
async function processTenantMessages(
    tenantPrisma: ReturnType<typeof getTenantPrisma>,
    evolutionInstance: string,
    evolutionApiKey: string | null,
    evolutionPhone: string | null,
    crmUserId: string,
    quotaState: QuotaState
): Promise<WorkerResult> {
    const result: WorkerResult = {
        processed: 0,
        sent: 0,
        failed: 0,
        deadLettered: 0,
        retried: 0,
        errors: [],
    };

    // Buscar mensagens pendentes e mensagens falhadas elegíveis para retry.
    // Elegibilidade é dona do módulo de ciclo de vida (mesma fonte de updateCampaignStatuses).
    const pendingMessages = await tenantPrisma.campaignMessage.findMany({
        where: eligibleForSendWhere(),
        include: {
            lead: {
                select: { 
                    phone: true, 
                    name: true,
                    interest: true,
                    aiSummary: true,
                    notes: { select: { content: true } }
                },
            },
        },
        orderBy: [
            { priority: "desc" },
            { scheduledAt: "asc" },
        ],
        take: MESSAGES_PER_BATCH,
    });

    if (pendingMessages.length === 0) {
        return result;
    }

    const evolutionClient = createEvolutionClient(evolutionInstance, evolutionApiKey || undefined);

    // Verificar se instância está conectada
    const status = await evolutionClient.getInstanceStatus();
    if (!status.connected) {
        result.errors.push(`Instance ${evolutionInstance} not connected`);
        return result;
    }

    // Estado de quota corrente do batch (relido do DB no próximo cron). Atualizado a
    // cada reescrita registrada e a cada reset aplicado.
    let quota = quotaState;

    for (const message of pendingMessages) {
        result.processed++;
        const isRetry = message.status === "FAILED";
        const currentRetry = message.retryCount ?? 0;

        // Marcar como PROCESSING
        await tenantPrisma.campaignMessage.update({
            where: { id: message.id },
            data: { status: "PROCESSING" },
        });

        try {
            let finalPayload = message.payload;
            let aiUsed = false;

            // Decide pela quota corrente (aplica e AVANÇA o reset devido). Antes o worker
            // nunca consultava aiLimitResetAt e travava o tenant no limite para sempre.
            const decision = canPersonalize(quota);
            if (decision.didReset && decision.nextState.resetAt) {
                await applyReset(crmUserId, decision.nextState.resetAt);
            }
            quota = decision.nextState;

            if (decision.allowed) {
                // 1. Extrair o contexto do lead para a IA
                const leadContext = {
                    name: message.lead.name,
                    interest: message.lead.interest,
                    aiSummary: message.lead.aiSummary,
                    notes: message.lead.notes.map(n => n.content)
                };

                // 2. Tentar hiper-personalizar a mensagem. Se falhar, retorna a original.
                const { text, usedLLM } = await aiPersonalizer.personalize(message.payload, leadContext);
                finalPayload = text;
                aiUsed = usedLLM;
            }

            // 3. Enviar a mensagem (personalizada ou original)
            await evolutionClient.sendMessage(message.lead.phone, finalPayload);

            // Sucesso — transição via applyOutcome (dona da decisão de estado)
            const sent = applyOutcome(currentRetry, { kind: "sent" });
            await tenantPrisma.campaignMessage.update({
                where: { id: message.id },
                data: {
                    status: sent.status,
                    sentAt: sent.sentAt,
                    error: sent.error,
                    payload: finalPayload, // Atualizamos o payload no banco para refletir o que realmente foi enviado
                },
            });

            // 4. Se usou IA, registra o consumo no banco CRM central
            if (aiUsed) {
                await recordPersonalization(crmUserId);
                quota = { ...quota, used: quota.used + 1 };
            }

            await persistOutboundMessageAudit(
                tenantPrisma,
                {
                    phone: message.lead.phone,
                    name: message.lead.name,
                    payload: finalPayload,
                },
                evolutionPhone
            );

            result.sent++;
            if (isRetry) result.retried++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            // Decisão FAILED-vs-DEAD_LETTER delegada ao módulo de ciclo de vida; aqui só I/O.
            const upd = applyOutcome(currentRetry, { kind: "error", message: errorMessage });
            await tenantPrisma.campaignMessage.update({
                where: { id: message.id },
                data: { status: upd.status, error: upd.error, retryCount: upd.retryCount },
            });
            if (upd.status === "DEAD_LETTER") result.deadLettered++;
            else result.failed++;

            result.errors.push(`Message ${message.id} (retry ${upd.retryCount}/${MAX_RETRIES}): ${errorMessage}`);
        }

        // Rate limiting — delay entre mensagens para evitar bloqueio no WhatsApp
        const delay = calculateDelay(currentRetry);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return result;
}

async function persistOutboundMessageAudit(
    tenantPrisma: ReturnType<typeof getTenantPrisma>,
    message: { phone: string; name: string; payload: string },
    evolutionPhone: string | null
): Promise<void> {
    try {
        // Match por identidade de telefone (canônico + fallback legado). Na criação,
        // grava whatsapp E phoneNormalized canônicos — evita o contato duplicado por
        // formato que antes fragmentava o histórico a cada número cru novo.
        const canonical = canonicalizePhone(message.phone);
        let contact = await findContactByPhone(tenantPrisma, message.phone);

        if (!contact) {
            contact = await tenantPrisma.whatsAppContact.create({
                data: {
                    whatsapp: canonical,
                    phoneNormalized: canonical,
                    name: message.name,
                    createdAt: new Date(),
                    isManual: false,
                },
            });
        }

        const agentPhone = evolutionPhone || "unknown_agent";
        const sessionId = `${message.phone}_${agentPhone}`;
        const threadId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

        await tenantPrisma.chatHistory.create({
            data: {
                userId: contact.id,
                sessionId,
                threadId,
                message: encodeOutboundAudit(message.payload),
                createdAt: new Date(),
            },
        });
    } catch (error) {
        console.error("Failed to persist outbound message audit:", error);
    }
}

/**
 * Processa tenants em paralelo com controle de concorrência
 */
async function processWithConcurrency<T>(
    items: T[],
    maxConcurrent: number,
    processor: (item: T) => Promise<void>
): Promise<void> {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += maxConcurrent) {
        chunks.push(items.slice(i, i + maxConcurrent));
    }
    for (const chunk of chunks) {
        await Promise.allSettled(chunk.map(processor));
    }
}

/**
 * Processa mensagens de todos os tenants configurados (em paralelo)
 */
export async function processAllTenantMessages(): Promise<{
    tenants: number;
    results: Record<string, WorkerResult>;
}> {
    const results: Record<string, WorkerResult> = {};

    const users = await prisma.crmUser.findMany({
        where: {
            role: "USER",
            databaseUrl: { not: null },
            evolutionInstance: { not: null },
        },
        select: {
            id: true,
            name: true,
            databaseUrl: true,
            evolutionInstance: true,
            evolutionApiKey: true,
            evolutionPhone: true,
            aiMessagesLimit: true,
            aiMessagesUsed: true,
            aiLimitResetAt: true,
        },
    });

    await processWithConcurrency(users, MAX_CONCURRENT_TENANTS, async (user) => {
        if (!user.databaseUrl || !user.evolutionInstance) return;

        try {
            const evolutionInstance = decrypt(user.evolutionInstance);
            const evolutionApiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : null;
            const evolutionPhone = user.evolutionPhone;

            const tenantPrisma = getTenantPrisma({ tenantId: user.id, encryptedUrl: user.databaseUrl });
            const result = await processTenantMessages(
                tenantPrisma,
                evolutionInstance,
                evolutionApiKey,
                evolutionPhone,
                user.id,
                {
                    used: user.aiMessagesUsed,
                    limit: user.aiMessagesLimit,
                    resetAt: user.aiLimitResetAt,
                }
            );
            results[user.name] = result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            results[user.name] = {
                processed: 0,
                sent: 0,
                failed: 0,
                deadLettered: 0,
                retried: 0,
                errors: [`Tenant error: ${errorMessage}`],
            };
        }
    });

    return {
        tenants: users.length,
        results,
    };
}

/**
 * Atualiza campanhas que foram completadas
 */
export async function updateCampaignStatuses(): Promise<number> {
    let updated = 0;

    const users = await prisma.crmUser.findMany({
        where: {
            role: "USER",
            databaseUrl: { not: null },
        },
        select: { id: true, databaseUrl: true },
    });

    for (const user of users) {
        if (!user.databaseUrl) continue;

        const tenantPrisma = getTenantPrisma({ tenantId: user.id, encryptedUrl: user.databaseUrl });

        // Buscar campanhas ativas
        const campaigns = await tenantPrisma.campaign.findMany({
            where: {
                status: { in: ["SCHEDULED", "PROCESSING"] },
            },
            include: {
                _count: {
                    select: { messages: true },
                },
                messages: {
                    where: unfinishedMessagesWhere(),
                    select: { id: true },
                },
            },
        });

        for (const campaign of campaigns) {
            const hasUnfinished = campaign.messages.length > 0;

            if (!hasUnfinished && campaign._count.messages > 0) {
                await tenantPrisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: "COMPLETED" },
                });
                updated++;
            } else if (campaign.status === "SCHEDULED" && campaign.scheduledAt <= new Date()) {
                await tenantPrisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: "PROCESSING" },
                });
                updated++;
            }
        }
    }

    return updated;
}
