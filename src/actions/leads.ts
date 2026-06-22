"use server";

import { requireTenantContext, getOptionalTenantContext } from "@/lib/tenant";
import { canonicalizePhone } from "@/lib/phone";
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

// Schema para validação de cada lead importado
const importLeadSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    phone: z.string().min(8, "Telefone inválido"),
    interest: z.string().optional(),
    tag: z
        .enum(["NEW", "QUALIFICATION", "PROSPECTING", "CALL", "MEETING", "RETURN", "LOST", "CUSTOMER"])
        .optional()
        .default("NEW"),
});

const VALID_TAGS = ["NEW", "QUALIFICATION", "PROSPECTING", "CALL", "MEETING", "RETURN", "LOST", "CUSTOMER"];

function normalizeTag(raw: string | undefined): LeadTag {
    if (!raw) return "NEW";
    const upper = raw.trim().toUpperCase();
    if (VALID_TAGS.includes(upper)) return upper as LeadTag;

    // Tentar mapear nomes em português
    const PT_TAG_MAP: Record<string, LeadTag> = {
        NOVO: "NEW",
        "QUALIFICAÇÃO": "QUALIFICATION",
        QUALIFICACAO: "QUALIFICATION",
        "PROSPECÇÃO": "PROSPECTING",
        PROSPECCAO: "PROSPECTING",
        "LIGAÇÃO": "CALL",
        LIGACAO: "CALL",
        "REUNIÃO": "MEETING",
        REUNIAO: "MEETING",
        RETORNO: "RETURN",
        PERDIDO: "LOST",
        CLIENTE: "CUSTOMER",
    };

    return PT_TAG_MAP[upper] || "NEW";
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: Array<{ row: number; field: string; message: string }>;
}

export async function importLeadsFromCSV(
    leads: Array<{ name: string; phone: string; interest?: string; tag?: string }>
): Promise<ImportResult> {
    const { tenantPrisma } = await requireTenantContext();

    const result: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [],
    };

    if (!leads || leads.length === 0) {
        throw new Error("Nenhum lead para importar");
    }

    if (leads.length > 5000) {
        throw new Error("Máximo de 5000 leads por importação");
    }

    // Buscar telefones já existentes para deduplicação (por forma canônica, não dígitos crus)
    const existingLeads = await tenantPrisma.lead.findMany({
        select: { phone: true },
    });
    const existingPhones = new Set(existingLeads.map((l: { phone: string }) => canonicalizePhone(l.phone)));

    const validLeads: Array<{ name: string; phone: string; phoneNormalized: string; interest?: string; tag: LeadTag }> = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 0; i < leads.length; i++) {
        const raw = leads[i];
        const rowNum = i + 2; // +2: header + 0-indexed

        // Validar campos obrigatórios
        if (!raw.name || raw.name.trim().length < 2) {
            result.errors.push({ row: rowNum, field: "nome", message: "Nome é obrigatório (mín. 2 caracteres)" });
            continue;
        }

        if (!raw.phone || raw.phone.trim().length < 8) {
            result.errors.push({ row: rowNum, field: "telefone", message: "Telefone é obrigatório" });
            continue;
        }

        const normalizedPhone = canonicalizePhone(raw.phone.trim());

        // Validar formato do telefone normalizado
        if (!/^\+?[1-9]\d{10,14}$/.test(normalizedPhone)) {
            result.errors.push({
                row: rowNum,
                field: "telefone",
                message: `Formato inválido: "${raw.phone}" → "${normalizedPhone}"`,
            });
            continue;
        }

        // Deduplicar contra banco existente (forma canônica)
        if (existingPhones.has(normalizedPhone)) {
            result.skipped++;
            continue;
        }

        // Deduplicar dentro do batch
        if (seenPhonesInBatch.has(normalizedPhone)) {
            result.skipped++;
            continue;
        }

        seenPhonesInBatch.add(normalizedPhone);

        validLeads.push({
            name: raw.name.trim(),
            phone: normalizedPhone,
            phoneNormalized: normalizedPhone,
            interest: raw.interest?.trim() || undefined,
            tag: normalizeTag(raw.tag),
        });
    }

    // Inserir em batch
    if (validLeads.length > 0) {
        await tenantPrisma.lead.createMany({
            data: validLeads,
        });
        result.imported = validLeads.length;
    }

    revalidatePath("/leads");
    return result;
}
