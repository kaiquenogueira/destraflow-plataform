"use server";

import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadTag, CampaignStatus } from "@/types";

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
        where: {
            messages: {
                none: {
                    campaign: {
                        status: {
                            in: ["SCHEDULED", "PROCESSING", "COMPLETED"]
                        }
                    }
                }
            }
        },
        include: {
            messages: {
                select: {
                    campaign: {
                        select: { name: true }
                    },
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return leads.map((lead: any) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        tag: lead.tag,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        campaigns: lead.messages
            .filter((m: any) => m.campaign)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => ({
                name: m.campaign.name,
                date: m.createdAt
            }))
    }));
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
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const campaign = await tenantPrisma.campaign.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: "desc" },
                include: {
                    lead: {
                        select: { name: true, phone: true },
                    },
                },
            },
            _count: {
                select: { messages: true },
            },
        },
    });

    if (!campaign) {
        throw new Error("Campanha não encontrada");
    }

    // Contar mensagens por status
    const statusCounts = await tenantPrisma.campaignMessage.groupBy({
        by: ["status"],
        where: { campaignId: id },
        _count: true,
    });

    return {
        ...campaign,
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
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const existing = await tenantPrisma.campaign.findUnique({
        where: { id },
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
            where: { id },
            data: { status: "CANCELLED" },
        }),
        tenantPrisma.campaignMessage.updateMany({
            where: { campaignId: id, status: "PENDING" },
            data: { status: "FAILED", error: "Campanha cancelada pelo usuário" },
        }),
    ]);

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${id}`);
    return { success: true };
}

// Envio unitário (imediato)
export async function sendUnitMessage(leadId: string, template: string) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const lead = await tenantPrisma.lead.findUnique({
        where: { id: leadId },
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    // Inserir na fila com prioridade alta e data imediata
    const message = await tenantPrisma.campaignMessage.create({
        data: {
            leadId: lead.id,
            payload: processTemplate(template, lead),
            scheduledAt: new Date(),
            status: "PENDING",
            priority: 1,
        },
    });

    revalidatePath(`/leads/${leadId}`);
    return { success: true, messageId: message.id };
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
