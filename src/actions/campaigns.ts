"use server";

import { requireTenantContext, getOptionalTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadTag, CampaignStatus } from "@/types";
import { CampaignPersonalizer } from "@/services/ai/campaign-personalizer";
import { canPersonalize, recordPersonalization, applyReset } from "@/services/ai/ai-quota";
import { nameSchema, campaignTemplateSchema, isScheduledFarEnough, SCHEDULE_ERROR_MESSAGE } from "@/lib/validation";

// Não inicializar instâncias globais que usem env vars diretamente fora de funções em arquivos de action
// Isso quebra os testes unitários que fazem mock do ambiente
let aiPersonalizerInstance: CampaignPersonalizer | null = null;

function getAIPersonalizer() {
    if (!aiPersonalizerInstance) {
        aiPersonalizerInstance = new CampaignPersonalizer();
    }
    return aiPersonalizerInstance;
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
    name: nameSchema,
    template: campaignTemplateSchema,
    targetTag: z.enum(["NEW", "QUALIFICATION", "PROSPECTING", "CALL", "MEETING", "RETURN", "LOST", "CUSTOMER"]).optional(),
    leadIds: z.array(z.string()).optional(),
    // Janela de agendamento: regra load-bearing compartilhada com o form (validation.ts).
    scheduledAt: z.coerce.date().refine(isScheduledFarEnough, SCHEDULE_ERROR_MESSAGE),
});

export async function getLeadsForCampaignSelection() {
    const context = await getOptionalTenantContext();
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

    return unique.map((lead) => {
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
                .filter((m: { campaign: { name: string } | null; createdAt: Date }) => m.campaign)
                .map((m: { campaign: { name: string } | null; createdAt: Date }) => ({ name: m.campaign!.name, date: m.createdAt })),
        };
    });
}

export async function createCampaign(
    data: z.infer<typeof createCampaignSchema>
) {
    const { tenantPrisma } = await requireTenantContext();
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
    const context = await getOptionalTenantContext();
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
    const { tenantPrisma } = await requireTenantContext();

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
    const { tenantPrisma } = await requireTenantContext();

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
    const { tenantPrisma } = await requireTenantContext();

    const lead = await tenantPrisma.lead.findUnique({
        where: { id: validLeadId },
        include: { notes: true }
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    const finalPayload = processTemplate(template, lead);

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
    const { tenantPrisma, userId, aiQuota } = await requireTenantContext();

    const decision = canPersonalize(aiQuota ?? { used: 0, limit: 15, resetAt: null });
    if (decision.didReset && decision.nextState.resetAt) {
        await applyReset(userId, decision.nextState.resetAt);
    }
    if (!decision.allowed) {
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

    const { text, usedLLM } = await getAIPersonalizer().personalize(finalPayload, leadContext);

    if (usedLLM) {
        await recordPersonalization(userId);
    }

    return { success: true, personalizedMessage: text };
}

// Reentrada de DEAD_LETTER: devolve a mensagem para a fila com contador zerado.
// Dono único do shape de reset (usado pelo retry em massa e individual).
function deadLetterReentryData() {
    return {
        status: "PENDING" as const,
        retryCount: 0,
        error: null,
        scheduledAt: new Date(),
    };
}

// Reabre a campanha (COMPLETED -> PROCESSING) quando uma mensagem é retentada.
// Regra de NÍVEL DE CAMPANHA — fica aqui, não no campaign-message-lifecycle,
// que possui só o estado de CampaignMessage (ver docs/sprint/sprint-04).
async function reopenCampaignIfCompleted(
    tenantPrisma: Awaited<ReturnType<typeof requireTenantContext>>["tenantPrisma"],
    campaignId: string,
): Promise<void> {
    const campaign = await tenantPrisma.campaign.findUnique({ where: { id: campaignId } });
    if (campaign?.status === "COMPLETED") {
        await tenantPrisma.campaign.update({
            where: { id: campaignId },
            data: { status: "PROCESSING" },
        });
    }
}

// Retry todas as mensagens DEAD_LETTER de uma campanha
export async function retryCampaignDeadLetters(campaignId: string) {
    const validId = z.string().parse(campaignId);
    const { tenantPrisma } = await requireTenantContext();

    const campaign = await tenantPrisma.campaign.findUnique({
        where: { id: validId },
    });

    if (!campaign) {
        throw new Error("Campanha não encontrada");
    }

    // Contar mensagens DEAD_LETTER antes do reset
    const deadLetterCount = await tenantPrisma.campaignMessage.count({
        where: { campaignId: validId, status: "DEAD_LETTER" },
    });

    if (deadLetterCount === 0) {
        throw new Error("Nenhuma mensagem com falha permanente para retentar");
    }

    // Resetar mensagens DEAD_LETTER para reentrada na fila e reabrir a campanha.
    await tenantPrisma.campaignMessage.updateMany({
        where: { campaignId: validId, status: "DEAD_LETTER" },
        data: deadLetterReentryData(),
    });
    await reopenCampaignIfCompleted(tenantPrisma, validId);

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${validId}`);
    return { success: true, retriedCount: deadLetterCount };
}

// Retry uma mensagem individual DEAD_LETTER
export async function retryDeadLetterMessage(messageId: string) {
    const validId = z.string().parse(messageId);
    const { tenantPrisma } = await requireTenantContext();

    const message = await tenantPrisma.campaignMessage.findUnique({
        where: { id: validId },
    });

    if (!message) {
        throw new Error("Mensagem não encontrada");
    }

    if (message.status !== "DEAD_LETTER") {
        throw new Error("Apenas mensagens com falha permanente podem ser retentadas");
    }

    await tenantPrisma.campaignMessage.update({
        where: { id: validId },
        data: deadLetterReentryData(),
    });

    // Reabrir a campanha associada se estava finalizada
    if (message.campaignId) {
        await reopenCampaignIfCompleted(tenantPrisma, message.campaignId);
        revalidatePath(`/campaigns/${message.campaignId}`);
    }

    revalidatePath("/campaigns");
    return { success: true };
}

// Métricas de campanhas
export async function getCampaignMetrics() {
    const context = await getOptionalTenantContext();
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
