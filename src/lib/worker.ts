/**
 * Worker de Processamento de Mensagens
 * 
 * Responsável por:
 * 1. Buscar mensagens pendentes de todos os tenants
 * 2. Enviar via Evolution API
 * 3. Atualizar status (SENT/FAILED)
 */

import { prisma, getTenantPrisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { decrypt } from "@/lib/encryption";

export interface WorkerResult {
    processed: number;
    sent: number;
    failed: number;
    errors: string[];
}

/**
 * Processa mensagens pendentes de um tenant específico
 */
async function processTenanMessages(
    tenantPrisma: ReturnType<typeof getTenantPrisma>,
    evolutionInstance: string,
    evolutionApiKey: string | null,
    evolutionPhone: string | null
): Promise<WorkerResult> {
    const result: WorkerResult = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [],
    };

    // Buscar mensagens pendentes que já passaram do horário
    const pendingMessages = await tenantPrisma.campaignMessage.findMany({
        where: {
            status: "PENDING",
            scheduledAt: {
                lte: new Date(),
            },
        },
        include: {
            lead: {
                select: { phone: true, name: true },
            },
        },
        orderBy: [
            { priority: "desc" }, // Prioridade alta primeiro
            { scheduledAt: "asc" }, // Mais antigos primeiro
        ],
        take: 10, // Processar em batches menores para evitar timeout com o delay aumentado
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

    // Processar cada mensagem
    for (const message of pendingMessages) {
        result.processed++;

        // Marcar como PROCESSING
        await tenantPrisma.campaignMessage.update({
            where: { id: message.id },
            data: { status: "PROCESSING" },
        });

        try {
            // Enviar mensagem
            await evolutionClient.sendMessage(message.lead.phone, message.payload);

            // Marcar como SENT
            await tenantPrisma.campaignMessage.update({
                where: { id: message.id },
                data: {
                    status: "SENT",
                    sentAt: new Date(),
                },
            });

            // ============================================================
            // FECHAR O CICLO: Criar registro em chat_histories
            // ============================================================
            
            // 1. Buscar ou criar WhatsAppContact (users)
            let contact = await tenantPrisma.whatsAppContact.findFirst({
                where: { whatsapp: message.lead.phone }
            });

            if (!contact) {
                contact = await tenantPrisma.whatsAppContact.create({
                    data: {
                        whatsapp: message.lead.phone,
                        name: message.lead.name,
                        createdAt: new Date(),
                        isManual: false 
                    }
                });
            }

            // 2. Criar histórico
            // session_id = whatsapp_cliente_whatsapp_agente
            // Ex: 5511999999999_5511888888888
            // Se evolutionPhone não estiver configurado, usa apenas o telefone do cliente como fallback ou tenta pegar da instancia
            
            const agentPhone = evolutionPhone || "unknown_agent";
            const sessionId = `${message.lead.phone}_${agentPhone}`;
            const threadId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
            
            // Estrutura de mensagem solicitada:
            // {"type": "system", "content": "{{mensagem tratada}}"}
            
            await tenantPrisma.chatHistory.create({
                data: {
                    userId: contact.id,
                    sessionId: sessionId,
                    threadId: threadId,
                    message: {
                        type: "system",
                        content: message.payload
                    },
                    createdAt: new Date()
                }
            });

            result.sent++;
        } catch (error) {
            // Marcar como FAILED
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            await tenantPrisma.campaignMessage.update({
                where: { id: message.id },
                data: {
                    status: "FAILED",
                    error: errorMessage,
                },
            });

            result.failed++;
            result.errors.push(`Message ${message.id}: ${errorMessage}`);
        }

        // Rate limiting - aguardar tempo aleatório entre 3s e 7s para evitar bloqueios do WhatsApp
        // Comportamento mais humano para evitar detecção de automação
        const minDelay = 3000;
        const maxDelay = 7000;
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return result;
}

/**
 * Processa mensagens de todos os tenants configurados
 */
export async function processAllTenantMessages(): Promise<{
    tenants: number;
    results: Record<string, WorkerResult>;
}> {
    const results: Record<string, WorkerResult> = {};

    // Buscar todos os usuários com banco e Evolution configurados
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

    for (const user of users) {
        if (!user.databaseUrl || !user.evolutionInstance) continue;

        try {
            const databaseUrl = decrypt(user.databaseUrl);
            const evolutionInstance = decrypt(user.evolutionInstance);
            const evolutionApiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : null;
            // evolutionPhone não é sensível, mas se precisar descriptografar no futuro, ajustar aqui.
            // Por enquanto, assumindo texto plano no schema ou seguindo padrão de criptografia se necessário.
            // O schema diz apenas String?, e não tem helper de decrypt no código original para ele.
            // Assumirei que é texto plano.
            const evolutionPhone = user.evolutionPhone;

            const tenantPrisma = getTenantPrisma(databaseUrl);
            const result = await processTenanMessages(
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
                errors: [`Tenant error: ${errorMessage}`],
            };
        }
    }

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

        // Buscar campanhas PROCESSING que não têm mais mensagens PENDING
        const campaigns = await tenantPrisma.campaign.findMany({
            where: {
                status: { in: ["SCHEDULED", "PROCESSING"] },
            },
            include: {
                _count: {
                    select: { messages: true },
                },
                messages: {
                    where: { status: "PENDING" },
                    select: { id: true },
                },
            },
        });

        for (const campaign of campaigns) {
            const hasPending = campaign.messages.length > 0;

            if (!hasPending && campaign._count.messages > 0) {
                // Todas as mensagens foram processadas
                await tenantPrisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: "COMPLETED" },
                });
                updated++;
            } else if (campaign.status === "SCHEDULED" && campaign.scheduledAt <= new Date()) {
                // Campanha deveria estar processando
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
