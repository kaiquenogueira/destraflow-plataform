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
    evolutionApiKey: string | null
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
        take: 50, // Processar em batches
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

        // Rate limiting - aguardar 1s entre mensagens
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
        },
    });

    for (const user of users) {
        if (!user.databaseUrl || !user.evolutionInstance) continue;

        try {
            const databaseUrl = decrypt(user.databaseUrl);
            const evolutionInstance = decrypt(user.evolutionInstance);
            const evolutionApiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : null;

            const tenantPrisma = getTenantPrisma(databaseUrl);
            const result = await processTenanMessages(
                tenantPrisma,
                evolutionInstance,
                evolutionApiKey
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
