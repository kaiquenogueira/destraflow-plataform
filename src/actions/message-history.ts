"use server";

import { requireTenantContext } from "@/lib/tenant";
import { findContactByPhone } from "@/lib/phone";
import { decodeChatEnvelope } from "@/lib/chat-envelope";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { createEvolutionClient } from "@/lib/evolution";
import { getUserEvolutionConfig } from "@/lib/evolution-config";
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
    const { tenantPrisma } = await requireTenantContext();

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
    // Buscar contato WhatsApp por identidade de telefone (canônico + fallback legado)
    const contact = await findContactByPhone(tenantPrisma, phone);

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
        // Decode dono do codec: direção e texto vêm do envelope; sem JSON cru vazando p/ UI.
        const { direction, text } = decodeChatEnvelope(msg.message);

        return {
            id: String(msg.id),
            direction,
            text,
            timestamp: msg.createdAt || new Date(),
            source: "database" as const,
        };
    });
}

/**
 * Buscar mensagens da Evolution API
 */
async function getMessagesFromEvolution(phone: string): Promise<NormalizedMessage[]> {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) return [];

    let config;
    try {
        config = await getUserEvolutionConfig(session.user.id);
    } catch {
        return []; // sem instância configurada → fallback silencioso (não é erro)
    }

    try {
        const client = createEvolutionClient(config.instanceName, config.apiKey);
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
