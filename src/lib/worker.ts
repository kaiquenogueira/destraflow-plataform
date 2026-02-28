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

const MAX_RETRIES = 3;
const MAX_CONCURRENT_TENANTS = 5;
const MESSAGES_PER_BATCH = 20;

export interface WorkerResult {
    processed: number;
    sent: number;
    failed: number;
    deadLettered: number;
    retried: number;
    errors: string[];
}

/**
 * Calcula delay com backoff exponencial + jitter para evitar detecção
 * Base: 2-8s para primeira tentativa, escala com retryCount
 */
function calculateDelay(retryCount: number): number {
    const baseMin = 2000;
    const baseMax = 8000;
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    const backoff = base * Math.pow(1.5, retryCount);
    // Jitter: ±20%
    const jitter = backoff * (0.8 + Math.random() * 0.4);
    return Math.min(jitter, 30000); // Cap at 30s
}

/**
 * Processa mensagens pendentes de um tenant específico
 */
async function processTenantMessages(
    tenantPrisma: ReturnType<typeof getTenantPrisma>,
    evolutionInstance: string,
    evolutionApiKey: string | null,
    evolutionPhone: string | null
): Promise<WorkerResult> {
    const result: WorkerResult = {
        processed: 0,
        sent: 0,
        failed: 0,
        deadLettered: 0,
        retried: 0,
        errors: [],
    };

    // Buscar mensagens pendentes e mensagens falhadas elegíveis para retry
    const pendingMessages = await tenantPrisma.campaignMessage.findMany({
        where: {
            OR: [
                {
                    status: "PENDING",
                    scheduledAt: { lte: new Date() },
                },
                {
                    status: "FAILED",
                    retryCount: { lt: MAX_RETRIES },
                    scheduledAt: { lte: new Date() },
                },
            ],
        },
        include: {
            lead: {
                select: { phone: true, name: true },
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

    for (const message of pendingMessages) {
        result.processed++;
        const isRetry = message.status === "FAILED";

        // Marcar como PROCESSING
        await tenantPrisma.campaignMessage.update({
            where: { id: message.id },
            data: { status: "PROCESSING" },
        });

        try {
            await evolutionClient.sendMessage(message.lead.phone, message.payload);

            // Sucesso — marcar como SENT
            await tenantPrisma.campaignMessage.update({
                where: { id: message.id },
                data: {
                    status: "SENT",
                    sentAt: new Date(),
                    error: null,
                },
            });

            // Registrar no histórico de chat
            let contact = await tenantPrisma.whatsAppContact.findFirst({
                where: { whatsapp: message.lead.phone },
            });

            if (!contact) {
                contact = await tenantPrisma.whatsAppContact.create({
                    data: {
                        whatsapp: message.lead.phone,
                        name: message.lead.name,
                        createdAt: new Date(),
                        isManual: false,
                    },
                });
            }

            const agentPhone = evolutionPhone || "unknown_agent";
            const sessionId = `${message.lead.phone}_${agentPhone}`;
            const threadId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

            await tenantPrisma.chatHistory.create({
                data: {
                    userId: contact.id,
                    sessionId,
                    threadId,
                    message: {
                        type: "system",
                        content: message.payload,
                    },
                    createdAt: new Date(),
                },
            });

            result.sent++;
            if (isRetry) result.retried++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const newRetryCount = (message.retryCount ?? 0) + 1;

            if (newRetryCount >= MAX_RETRIES) {
                // Dead letter — falha permanente
                await tenantPrisma.campaignMessage.update({
                    where: { id: message.id },
                    data: {
                        status: "DEAD_LETTER",
                        error: `Falha permanente após ${MAX_RETRIES} tentativas: ${errorMessage}`,
                        retryCount: newRetryCount,
                    },
                });
                result.deadLettered++;
            } else {
                // Marcar como FAILED para retry na próxima execução
                await tenantPrisma.campaignMessage.update({
                    where: { id: message.id },
                    data: {
                        status: "FAILED",
                        error: errorMessage,
                        retryCount: newRetryCount,
                    },
                });
                result.failed++;
            }

            result.errors.push(`Message ${message.id} (retry ${newRetryCount}/${MAX_RETRIES}): ${errorMessage}`);
        }

        // Rate limiting — delay entre mensagens para evitar bloqueio no WhatsApp
        const delay = calculateDelay(message.retryCount ?? 0);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return result;
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
        },
    });

    await processWithConcurrency(users, MAX_CONCURRENT_TENANTS, async (user) => {
        if (!user.databaseUrl || !user.evolutionInstance) return;

        try {
            const databaseUrl = decrypt(user.databaseUrl);
            const evolutionInstance = decrypt(user.evolutionInstance);
            const evolutionApiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : null;
            const evolutionPhone = user.evolutionPhone;

            const tenantPrisma = getTenantPrisma(databaseUrl);
            const result = await processTenantMessages(
                tenantPrisma,
                evolutionInstance,
                evolutionApiKey,
                evolutionPhone
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
        select: { databaseUrl: true },
    });

    for (const user of users) {
        if (!user.databaseUrl) continue;

        const databaseUrl = decrypt(user.databaseUrl);
        const tenantPrisma = getTenantPrisma(databaseUrl);

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
                    where: { status: { in: ["PENDING", "FAILED"] } },
                    select: { id: true },
                },
            },
        });

        for (const campaign of campaigns) {
            const hasPendingOrFailed = campaign.messages.length > 0;

            if (!hasPendingOrFailed && campaign._count.messages > 0) {
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
