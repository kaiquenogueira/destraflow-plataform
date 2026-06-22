"use server";

import { requireTenantContext, getOptionalTenantContext } from "@/lib/tenant";
import { canonicalizePhone } from "@/lib/phone";
import { buildIntakePlan, MAX_IMPORT, type RawRow } from "@/lib/lead-intake";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeadTag } from "@/types";
import { startOfDay, endOfDay, parseISO } from "date-fns";

// Validation schemas
const createLeadSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    phone: z
        .string()
        .regex(/^\+?[1-9]\d{10,14}$/, "Telefone inválido (use formato +5511999999999)"),
    interest: z.string().optional(),
    tag: z.enum(["NEW", "QUALIFICATION", "PROSPECTING", "CALL", "MEETING", "RETURN", "LOST", "CUSTOMER"]),
});

const updateLeadSchema = createLeadSchema.partial().extend({
    id: z.string(),
});

export async function createLead(data: z.infer<typeof createLeadSchema>) {
    const { tenantPrisma } = await requireTenantContext();
    const validated = createLeadSchema.parse(data);

    const lead = await tenantPrisma.lead.create({
        data: { ...validated, phoneNormalized: canonicalizePhone(validated.phone) },
    });

    revalidatePath("/leads");
    return { success: true, lead };
}

export async function updateLead(data: z.infer<typeof updateLeadSchema>) {
    const { tenantPrisma } = await requireTenantContext();
    const validated = updateLeadSchema.parse(data);
    const { id, ...updateData } = validated;

    // Se o telefone muda, recalcula phoneNormalized — senão a forma canônica fica
    // obsoleta e o match lead↔contato volta a divergir (o bug que o Sprint 02 corrige).
    const dataToWrite = updateData.phone
        ? { ...updateData, phoneNormalized: canonicalizePhone(updateData.phone) }
        : updateData;

    const lead = await tenantPrisma.lead.update({
        where: { id },
        data: dataToWrite,
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true, lead };
}

export async function updateLeadTag(id: string, tag: LeadTag) {
    const validId = z.string().parse(id);
    const { tenantPrisma } = await requireTenantContext();

    try {
        const lead = await tenantPrisma.lead.update({
            where: { id: validId },
            data: { tag },
        });

        revalidatePath("/leads");
        revalidatePath(`/leads/${id}`);
        return { success: true, lead };
    } catch (error) {
        console.error("Error updating lead tag:", error);
        throw new Error("Erro ao atualizar tag do lead");
    }
}

export async function deleteLead(id: string) {
    const validId = z.string().parse(id);
    const { tenantPrisma } = await requireTenantContext();

    await tenantPrisma.lead.delete({
        where: { id: validId },
    });

    revalidatePath("/leads");
    return { success: true };
}

export async function getLeads(params?: {
    search?: string;
    tag?: LeadTag;
    page?: number;
    limit?: number;
    date?: string; // Format: YYYY-MM-DD
    aiPotential?: string;
    orderBy?: string;
    orderDirection?: "asc" | "desc";
}) {
    const context = await getOptionalTenantContext();
    if (!context) {
        // Retorna vazio para admins sem banco
        return {
            leads: [],
            total: 0,
            pages: 0,
            currentPage: 1,
            noDatabaseConfigured: true,
        };
    }
    const { tenantPrisma } = context;
    const {
        search,
        tag,
        page = 1,
        limit = 20,
        date,
        aiPotential,
        orderBy = "updatedAt",
        orderDirection = "desc"
    } = params || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        ...(tag ? { tag } : {}),
        ...(aiPotential ? { aiPotential: { contains: aiPotential, mode: "insensitive" } } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { phone: { contains: search } },
                ],
            }
            : {}),
    };

    if (date) {
        const parsedDate = parseISO(date);
        where.updatedAt = {
            gte: startOfDay(parsedDate),
            lte: endOfDay(parsedDate),
        };
    }

    // Validate orderBy field
    const validSortFields = [
        "name",
        "createdAt",
        "updatedAt",
        "aiScore",
        "aiPotential",
        "tag",
        "phone",
        "interest"
    ];

    const sortField = validSortFields.includes(orderBy) ? orderBy : "updatedAt";

    const [leads, total] = await Promise.all([
        tenantPrisma.lead.findMany({
            where,
            orderBy: { [sortField]: orderDirection },
            skip: (page - 1) * limit,
            take: limit,
        }),
        tenantPrisma.lead.count({ where }),
    ]);

    return {
        leads,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        aiUsage: {
            used: context.aiQuota?.used ?? 0,
            limit: context.aiQuota?.limit ?? 15
        }
    };
}

export async function getLeadById(id: string) {
    const { tenantPrisma } = await requireTenantContext();

    const lead = await tenantPrisma.lead.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: "desc" },
                take: 10,
            },
        },
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    return lead;
}

export async function getLeadsByTag() {
    const context = await getOptionalTenantContext();
    if (!context) {
        return {} as Record<LeadTag, number>;
    }
    const { tenantPrisma } = context;

    const counts = await tenantPrisma.lead.groupBy({
        by: ["tag"],
        _count: true,
    });

    return counts.reduce(
        (acc: Record<string, number>, item: { tag: string; _count: number }) => {
            acc[item.tag] = item._count;
            return acc;
        },
        {} as Record<LeadTag, number>
    );
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; field: string; message: string }>;
}

/**
 * Casca fina sobre `buildIntakePlan` (dono único das regras de import — ver
 * src/lib/lead-intake.ts). Aqui só vive o I/O: cap de linhas, leitura dos
 * telefones existentes para dedup de existência e o `createMany`. Recebe linhas
 * CRUAS (header → valor) para reaplicar o dedup de DB de forma autoritativa,
 * idêntico ao que o preview do cliente já mostrou.
 */
export async function importLeadsFromCSV(rows: RawRow[]): Promise<ImportResult> {
    const { tenantPrisma } = await requireTenantContext();

    if (!rows || rows.length === 0) {
        throw new Error("Nenhum lead para importar");
    }

    if (rows.length > MAX_IMPORT) {
        throw new Error(`Máximo de ${MAX_IMPORT} leads por importação`);
    }

    // Telefones já existentes, na forma canônica, para dedup de existência.
    const existingLeads = await tenantPrisma.lead.findMany({ select: { phone: true } });
    const existingCanonicalPhones = new Set(
        existingLeads.map((l: { phone: string }) => canonicalizePhone(l.phone))
    );

    const plan = buildIntakePlan(rows, { existingCanonicalPhones });

    if (plan.validLeads.length > 0) {
        await tenantPrisma.lead.createMany({ data: plan.validLeads });
    }

    revalidatePath("/leads");
    return {
        imported: plan.validLeads.length,
        skipped: plan.skipped.length,
        errors: plan.errors,
    };
}
