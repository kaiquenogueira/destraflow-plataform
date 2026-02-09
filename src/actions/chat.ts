"use server";

import { getTenantContext } from "@/lib/tenant";

interface ChatMessage {
    type: "incoming" | "outgoing";
    text: string;
    timestamp?: number;
    messageId?: string;
}

/**
 * Buscar histórico de chat por contato
 */
export async function getChatHistoryByContact(
    contactId: number,
    params?: { page?: number; limit?: number }
) {
    const context = await getTenantContext();
    if (!context) {
        return { messages: [], total: 0, pages: 0, currentPage: 1 };
    }
    const { tenantPrisma } = context;
    const { page = 1, limit = 50 } = params || {};

    const [messages, total] = await Promise.all([
        tenantPrisma.chatHistory.findMany({
            where: { userId: contactId },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        tenantPrisma.chatHistory.count({ where: { userId: contactId } }),
    ]);

    return {
        messages,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
    };
}

/**
 * Buscar histórico de chat por Lead (via telefone)
 */
export async function getChatHistoryByLead(leadId: string) {
    const context = await getTenantContext();
    if (!context) {
        return { messages: [], contact: null };
    }
    const { tenantPrisma } = context;

    // Buscar lead para pegar o telefone
    const lead = await tenantPrisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true },
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    // Buscar contato WhatsApp pelo telefone
    const contact = await tenantPrisma.whatsAppContact.findFirst({
        where: { whatsapp: lead.phone },
    });

    if (!contact) {
        return { messages: [], contact: null };
    }

    // Buscar histórico
    const messages = await tenantPrisma.chatHistory.findMany({
        where: { userId: contact.id },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    return { messages, contact };
}

/**
 * Buscar últimas mensagens (para dashboard)
 */
export async function getRecentMessages(limit: number = 10) {
    const context = await getTenantContext();
    if (!context) {
        return [];
    }
    const { tenantPrisma } = context;

    const messages = await tenantPrisma.chatHistory.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            message: true,
            createdAt: true,
            userId: true,
        },
    });

    // Enriquecer com dados do contato
    const contactIds = [...new Set(messages.map((m: { userId: number | null }) => m.userId).filter(Boolean))];
    const contacts = await tenantPrisma.whatsAppContact.findMany({
        where: { id: { in: contactIds as number[] } },
        select: { id: true, name: true, whatsapp: true },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    return messages.map((msg) => ({
        ...msg,
        contact: msg.userId ? contactMap.get(msg.userId) : null,
    }));
}

/**
 * Estatísticas de chat
 */
export async function getChatStats() {
    const context = await getTenantContext();
    if (!context) {
        return { totalMessages: 0, todayMessages: 0, tokensUsed: 0 };
    }
    const { tenantPrisma } = context;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMessages, todayMessages, tokenStats] = await Promise.all([
        tenantPrisma.chatHistory.count(),
        tenantPrisma.chatHistory.count({
            where: { createdAt: { gte: today } },
        }),
        tenantPrisma.chatHistory.aggregate({
            _sum: {
                tokensIn: true,
                tokensOut: true,
            },
        }),
    ]);

    return {
        totalMessages,
        todayMessages,
        tokensUsed: (tokenStats._sum.tokensIn || 0) + (tokenStats._sum.tokensOut || 0),
    };
}
