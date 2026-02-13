"use server";

import { getTenantContext } from "@/lib/tenant";
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
    tag: z.enum(["COLD", "WARM", "HOT", "LOST", "CUSTOMER"]),
});

const updateLeadSchema = createLeadSchema.partial().extend({
    id: z.string(),
});

export async function createLead(data: z.infer<typeof createLeadSchema>) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;
    const validated = createLeadSchema.parse(data);

    const lead = await tenantPrisma.lead.create({
        data: validated,
    });

    revalidatePath("/leads");
    return { success: true, lead };
}

export async function updateLead(data: z.infer<typeof updateLeadSchema>) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;
    const validated = updateLeadSchema.parse(data);
    const { id, ...updateData } = validated;

    const lead = await tenantPrisma.lead.update({
        where: { id },
        data: updateData,
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true, lead };
}

export async function updateLeadTag(id: string, tag: LeadTag) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    try {
        const lead = await tenantPrisma.lead.update({
            where: { id },
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
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    await tenantPrisma.lead.delete({
        where: { id },
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
    const context = await getTenantContext();
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
    };
}

export async function getLeadById(id: string) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

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
    const context = await getTenantContext();
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
