"use server";

import { getTenantContext } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { decrypt } from "@/lib/encryption";
import type { EvolutionMessage } from "@/lib/evolution";

export interface NormalizedMessage {
    id: string;
    direction: "incoming" | "outgoing";
    text: string;
    timestamp: Date;
    status?: string;
    source: "database" | "evolution";
}

/**
 * Buscar histórico de mensagens de um lead (DB + Evolution API fallback)
 */
export async function getMessageHistoryByLead(
    leadId: string
): Promise<{ messages: NormalizedMessage[]; leadName: string; leadPhone: string }> {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    // Buscar lead
    const lead = await tenantPrisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true, name: true },
    });

    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    // 1. Tentar buscar histórico do banco de dados local
    const dbMessages = await getMessagesFromDatabase(tenantPrisma, lead.phone);

    // 2. Se o DB tem mensagens, usar apenas o DB
    if (dbMessages.length > 0) {
        return {
            messages: dbMessages,
            leadName: lead.name,
            leadPhone: lead.phone,
        };
    }

    // 3. Fallback: buscar da Evolution API
    const evolutionMessages = await getMessagesFromEvolution(lead.phone);

    return {
        messages: evolutionMessages,
        leadName: lead.name,
        leadPhone: lead.phone,
    };
}

/**
 * Buscar mensagens do banco de dados (chat_histories)
 */
async function getMessagesFromDatabase(
    tenantPrisma: ReturnType<typeof import("@/lib/prisma").getTenantPrisma>,
    phone: string
): Promise<NormalizedMessage[]> {
    // Buscar contato WhatsApp pelo telefone
    const contact = await tenantPrisma.whatsAppContact.findFirst({
        where: { whatsapp: phone },
    });

    if (!contact) {
        return [];
    }

    // Buscar histórico de chat
    const chatMessages = await tenantPrisma.chatHistory.findMany({
        where: { userId: contact.id },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    return chatMessages.map((msg) => {
        const messageData = msg.message as { type?: string; content?: string } | null;
        const isOutgoing = messageData?.type === "system" || messageData?.type === "outgoing";

        return {
            id: String(msg.id),
            direction: isOutgoing ? "outgoing" as const : "incoming" as const,
            text: messageData?.content || JSON.stringify(msg.message) || "",
            timestamp: msg.createdAt || new Date(),
            source: "database" as const,
        };
    });
}

/**
 * Buscar mensagens da Evolution API
 */
async function getMessagesFromEvolution(phone: string): Promise<NormalizedMessage[]> {
    try {
        const session = await getServerSession(authConfig);
        if (!session?.user?.id) return [];

        const user = await prisma.crmUser.findUnique({
            where: { id: session.user.id },
            select: {
                evolutionInstance: true,
                evolutionApiKey: true,
            },
        });

        if (!user?.evolutionInstance) return [];

        const instanceName = decrypt(user.evolutionInstance);
        const apiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined;

        const client = createEvolutionClient(instanceName, apiKey);
        const messages = await client.fetchMessages(phone, { limit: 50 });

        return normalizeEvolutionMessages(messages);
    } catch (error) {
        console.error("Error fetching messages from Evolution:", error);
        return [];
    }
}

/**
 * Normalizar mensagens da Evolution API para formato unificado
 */
function normalizeEvolutionMessages(messages: EvolutionMessage[]): NormalizedMessage[] {
    if (!Array.isArray(messages)) return [];

    const normalized: NormalizedMessage[] = [];

    for (const msg of messages) {
        const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

        if (!text) continue;

        normalized.push({
            id: msg.key.id,
            direction: msg.key.fromMe ? "outgoing" : "incoming",
            text,
            timestamp: msg.messageTimestamp
                ? new Date(msg.messageTimestamp * 1000)
                : new Date(),
            status: msg.status,
            source: "evolution",
        });
    }

    return normalized;
}
