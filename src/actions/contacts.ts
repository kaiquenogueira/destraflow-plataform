"use server";

import { getTenantContext } from "@/lib/tenant";

/**
 * Buscar contatos WhatsApp
 */
export async function getContacts(params?: {
    search?: string;
    page?: number;
    limit?: number;
}) {
    const context = await getTenantContext();
    if (!context) {
        return { contacts: [], total: 0, pages: 0, currentPage: 1 };
    }
    const { tenantPrisma } = context;
    const { search, page = 1, limit = 20 } = params || {};

    const where = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { whatsapp: { contains: search } },
            ],
        }
        : {};

    const [contacts, total] = await Promise.all([
        tenantPrisma.whatsAppContact.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        tenantPrisma.whatsAppContact.count({ where }),
    ]);

    return {
        contacts,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
    };
}

/**
 * Buscar contato por ID
 */
export async function getContactById(id: number) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const contact = await tenantPrisma.whatsAppContact.findUnique({
        where: { id },
    });

    if (!contact) {
        throw new Error("Contato não encontrado");
    }

    return contact;
}

/**
 * Sincronizar contato WhatsApp com Lead
 * Cria Lead se não existir
 */
export async function syncContactToLead(contactId: number) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const contact = await tenantPrisma.whatsAppContact.findUnique({
        where: { id: contactId },
    });

    if (!contact || !contact.whatsapp) {
        throw new Error("Contato não encontrado ou sem número");
    }

    // Verificar se já existe Lead com mesmo telefone
    let lead = await tenantPrisma.lead.findFirst({
        where: { phone: contact.whatsapp },
    });

    if (!lead) {
        // Criar novo Lead
        lead = await tenantPrisma.lead.create({
            data: {
                name: contact.name || contact.whatsapp,
                phone: contact.whatsapp,
                tag: "NEW",
            },
        });
    }

    return { success: true, lead };
}

/**
 * Buscar estatísticas de contatos
 */
export async function getContactStats() {
    const context = await getTenantContext();
    if (!context) {
        return { total: 0, withThread: 0, manual: 0 };
    }
    const { tenantPrisma } = context;

    const [total, withThread, manual] = await Promise.all([
        tenantPrisma.whatsAppContact.count(),
        tenantPrisma.whatsAppContact.count({
            where: { threadId: { not: null } },
        }),
        tenantPrisma.whatsAppContact.count({
            where: { isManual: true },
        }),
    ]);

    return { total, withThread, manual };
}
