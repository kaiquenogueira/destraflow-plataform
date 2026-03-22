"use server";

import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadTag, CampaignStatus } from "@/types";
import { CampaignPersonalizer } from "@/services/ai/campaign-personalizer";

// Não inicializar instâncias globais que usem env vars diretamente fora de funções em arquivos de action
// Isso quebra os testes unitários que fazem mock do ambiente
let aiPersonalizerInstance: CampaignPersonalizer | null = null;

function getAIPersonalizer() {
    if (!aiPersonalizerInstance) {
        aiPersonalizerInstance = new CampaignPersonalizer();
    }
    return aiPersonalizerInstance;
}

interface QuotaPrismaClient {
    crmUser: {
        update: (args: {
            where: { id: string };
            data: { aiMessagesUsed: { increment: number } | { set: number } };
        }) => Promise<unknown>;
    };
}

async function incrementAIUsage(userId: string, quotaPrisma: QuotaPrismaClient = prisma) {
    await quotaPrisma.crmUser.update({
        where: { id: userId },
        data: { aiMessagesUsed: { increment: 1 } },
    });
}

async function resetAIUsage(userId: string, quotaPrisma: QuotaPrismaClient = prisma) {
    await quotaPrisma.crmUser.update({
        where: { id: userId },
        data: { aiMessagesUsed: { set: 0 } },
    });
}

// Template processing - substitui variáveis como {{nome}} pelo valor real
function processTemplate(
    template: string,
    lead: { name: string; phone: string; interest?: string | null }
): string {
    return template
        .replace(/\{\{nome\}\}/gi, lead.name)
        .replace(/\{\{telefone\}\}/gi, lead.phone)
        .replace(/\{\{interesse\}\}/gi, lead.interest || "");
}

// Validation schemas
const createCampaignSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    template: z.string().min(10, "Template deve ter pelo menos 10 caracteres"),
    targetTag: z.enum(["NEW", "QUALIFICATION", "PROSPECTING", "CALL", "MEETING", "RETURN", "LOST", "CUSTOMER"]).optional(),
    leadIds: z.array(z.string()).optional(),
    scheduledAt: z.coerce.date().refine((date) => {
        // Permitir uma margem de erro de alguns segundos para latência de rede, 
        // mas garantir que seja pelo menos ~10 minutos no futuro.
        // Usando 9.5 minutos para evitar rejeições por milissegundos na borda.
        return date.getTime() > Date.now() + (9.5 * 60 * 1000);
    }, "A campanha deve ser agendada com no mínimo 10 minutos de antecedência"),
});

export async function getLeadsForCampaignSelection() {
    const context = await getTenantContext();
    if (!context) return [];

    const leads = await context.tenantPrisma.lead.findMany({
        include: {
            messages: {
                where: {
                    campaign: {
                        status: { in: ["SCHEDULED", "PROCESSING", "COMPLETED"] }
                    }
                },
                select: {
                    campaign: { select: { name: true } },
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Deduplica por telefone (mantém o registro mais recente)
    const seen = new Map<string, boolean>();
    const unique = leads.filter((lead) => {
        const phone = lead.phone.replace(/\D/g, "");
        if (seen.has(phone)) return false;
        seen.set(phone, true);
        return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return unique.map((lead: any) => {
        const lastMessage = lead.messages[0];
        return {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            tag: lead.tag,
            lastCampaign: lastMessage?.campaign
                ? { name: lastMessage.campaign.name, date: lastMessage.createdAt }
                : null,
            campaigns: lead.messages
                .filter((m: any) => m.campaign)
                .map((m: any) => ({ name: m.campaign.name, date: m.createdAt })),
        };
    });
}

export async function createCampaign(
    data: z.infer<typeof createCampaignSchema>
) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;
    const validated = createCampaignSchema.parse(data);

    // 1. Criar campanha
    const campaign = await tenantPrisma.campaign.create({
        data: {
            name: validated.name,
            template: validated.template,
            targetTag: validated.targetTag as LeadTag | undefined,
            scheduledAt: validated.scheduledAt,
            status: "SCHEDULED",
        },
    });

    // 2. Buscar leads baseado na seleção ou segmentação
    let leads;
    if (validated.leadIds && validated.leadIds.length > 0) {
        leads = await tenantPrisma.lead.findMany({
            where: { id: { in: validated.leadIds } }
        });
    } else {
        leads = await tenantPrisma.lead.findMany({
            where: validated.targetTag ? { tag: validated.targetTag as LeadTag } : {},
        });
    }

    // 3. Criar mensagens na fila para cada lead
    if (leads.length > 0) {
        const messages = leads.map((lead: { id: string; name: string; phone: string; interest: string | null }) => ({
            campaignId: campaign.id,
            leadId: lead.id,
            payload: processTemplate(validated.template, lead),
            scheduledAt: validated.scheduledAt,
            status: "PENDING" as const,
            priority: 0,
        }));

        await tenantPrisma.campaignMessage.createMany({ data: messages });
    }

    revalidatePath("/campaigns");
    return {
        success: true,
        campaign,
        leadsCount: leads.length,
    };
}

export async function getCampaigns(params?: {
    status?: CampaignStatus;
    page?: number;
    limit?: number;
}) {
    const context = await getTenantContext();
    if (!context) {
        return {
            campaigns: [],
            total: 0,
            pages: 0,
            currentPage: 1,
            noDatabaseConfigured: true,
        };
    }
    const { tenantPrisma } = context;
    const { status, page = 1, limit = 20 } = params || {};

    const where = status ? { status } : {};

    const [campaigns, total] = await Promise.all([
        tenantPrisma.campaign.findMany({
            where,
            orderBy: { scheduledAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                _count: {
                    select: { messages: true },
                },
            },
        }),
        tenantPrisma.campaign.count({ where }),
    ]);

    return {
        campaigns,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
    };
}

export async function getCampaignById(id: string) {
    const validId = z.string().parse(id);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const [campaign, messages, count, statusCounts] = await Promise.all([
        tenantPrisma.campaign.findUnique({
            where: { id: validId },
        }),
        tenantPrisma.campaignMessage.findMany({
            where: { campaignId: validId },
            orderBy: { createdAt: "desc" },
            include: {
                lead: {
                    select: { name: true, phone: true },
                },
            },
        }),
        tenantPrisma.campaignMessage.count({
            where: { campaignId: validId },
        }),
        tenantPrisma.campaignMessage.groupBy({
            by: ["status"],
            where: { campaignId: validId },
            _count: true,
        }),
    ]);

    if (!campaign) {
        throw new Error("Campanha não encontrada");
    }

    return {
        ...campaign,
        messages,
        _count: { messages: count },
        statusCounts: statusCounts.reduce(
            (acc: Record<string, number>, item: { status: string; _count: number }) => {
                acc[item.status] = item._count;
                return acc;
            },
            {} as Record<string, number>
        ),
    };
}

export async function cancelCampaign(id: string) {
    const validId = z.string().parse(id);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const existing = await tenantPrisma.campaign.findUnique({
        where: { id: validId },
    });

    if (!existing) {
        throw new Error("Campanha não encontrada");
    }

    if (existing.status !== "SCHEDULED") {
        throw new Error("Apenas campanhas agendadas podem ser canceladas");
    }

    // Transação: cancelar campanha e mensagens pendentes
    await tenantPrisma.$transaction([
        tenantPrisma.campaign.update({
            where: { id: validId },
            data: { status: "CANCELLED" },
        }),
        tenantPrisma.campaignMessage.updateMany({
            where: { campaignId: validId, status: "PENDING" },
            data: { status: "FAILED", error: "Campanha cancelada pelo usuário" },
        }),
    ]);

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${validId}`);
    return { success: true };
}

// Envio unitário (imediato)
export async function sendUnitMessage(leadId: string, template: string) {
    const validLeadId = z.string().parse(leadId);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const lead = await tenantPrisma.lead.findUnique({
        where: { id: validLeadId },
        include: { notes: true }
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    let finalPayload = processTemplate(template, lead);

    // Inserir na fila com prioridade alta e data imediata
    const message = await tenantPrisma.campaignMessage.create({
        data: {
            leadId: lead.id,
            payload: finalPayload,
            scheduledAt: new Date(),
            status: "PENDING",
            priority: 1,
        },
    });

    revalidatePath(`/leads/${validLeadId}`);
    return { success: true, messageId: message.id };
}

// Gerar sugestão de mensagem via IA
export async function generateAIPersonalizedMessage(leadId: string, template: string) {
    const validLeadId = z.string().parse(leadId);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma, userId, aiMessagesUsed = 0, aiMessagesLimit = 15, aiLimitResetAt } = context;

    let currentAIMessagesUsed = aiMessagesUsed;
    if (aiLimitResetAt && new Date() > aiLimitResetAt) {
        await resetAIUsage(userId);
        currentAIMessagesUsed = 0;
    }

    if (currentAIMessagesUsed >= aiMessagesLimit) {
        throw new Error("Limite mensal de IA atingido.");
    }

    const lead = await tenantPrisma.lead.findUnique({
        where: { id: validLeadId },
        include: { notes: true }
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    const finalPayload = processTemplate(template, lead);

    const leadContext = {
        name: lead.name,
        interest: lead.interest,
        aiSummary: lead.aiSummary,
        notes: lead.notes.map(n => n.content)
    };

    const personalizedPayload = await getAIPersonalizer().personalize(finalPayload, leadContext);
    
    if (personalizedPayload !== finalPayload) {
        await incrementAIUsage(userId);
    }

    return { success: true, personalizedMessage: personalizedPayload };
}

// Métricas de campanhas
export async function getCampaignMetrics() {
    const context = await getTenantContext();
    if (!context) {
        return { pending: 0, sent: 0, failed: 0 };
    }
    const { tenantPrisma } = context;

    const [pending, sent, failed] = await Promise.all([
        tenantPrisma.campaignMessage.count({ where: { status: "PENDING" } }),
        tenantPrisma.campaignMessage.count({ where: { status: "SENT" } }),
        tenantPrisma.campaignMessage.count({ where: { status: "FAILED" } }),
    ]);

    return { pending, sent, failed };
}
