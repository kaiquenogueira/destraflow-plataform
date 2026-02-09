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
    targetTag: z.enum(["COLD", "WARM", "HOT", "LOST", "CUSTOMER"]).optional(),
    scheduledAt: z.coerce.date(),
});

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

    // 2. Buscar leads baseado na segmentação
    const leads = await tenantPrisma.lead.findMany({
        where: validated.targetTag ? { tag: validated.targetTag as LeadTag } : {},
    });

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
