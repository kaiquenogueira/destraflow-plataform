/**
 * Codec do envelope `ChatHistory.message` — dono do contrato writer ↔ reader.
 *
 * O envelope `{ type, content }` gravado pelo worker e lido por `message-history.ts`
 * (e tocado por N8N, que também escreve nessa tabela — ver docs/ARCHITECTURE.md) era um
 * contrato NÃO documentado: o discriminador de direção `"system"` aparecia como string
 * literal solta em ambos os lados, sem fonte compartilhada. Renomear a tag no writer
 * reclassificava silenciosamente toda mensagem outbound como incoming, sem teste falhar.
 * Aqui o discriminador é fixado UMA vez e encode/decode ganham um dono.
 *
 * Escopo deliberadamente FINO (Sprint 04): isto NÃO é uma máquina de tipos para todo
 * produtor hipotético. Não há produtor de `incoming` com outro shape no repo hoje; o
 * ganho é localidade + pin de um discriminador + teste que cruza a costura. Manter raso.
 */

/** Discriminador único da auditoria outbound gravada pelo worker. */
export const OUTBOUND_AUDIT_TYPE = "system" as const;

/** Tipos reconhecidos como saída (empresa → lead). */
const OUTGOING_TYPES = new Set<string>([OUTBOUND_AUDIT_TYPE, "outgoing"]);

// type (não interface): um alias de objeto é estruturalmente atribuível ao
// InputJsonObject do Prisma (índice de string); uma interface nomeada não seria.
export type ChatEnvelope = {
    type?: string;
    content?: string;
};

export interface DecodedMessage {
    direction: "incoming" | "outgoing";
    text: string;
}

/** Encode da linha de auditoria outbound (writer). */
export function encodeOutboundAudit(content: string): ChatEnvelope {
    return { type: OUTBOUND_AUDIT_TYPE, content };
}

/**
 * Decode de uma linha de `ChatHistory.message` para `{ direction, text }` (reader).
 * Fallback EXPLÍCITO: texto não-string vira string vazia — nunca vaza JSON cru para a UI
 * (o reader antigo caía em `JSON.stringify(msg.message)`, mostrando `{"type":...}` no balão).
 */
export function decodeChatEnvelope(raw: unknown): DecodedMessage {
    const env = (raw ?? {}) as ChatEnvelope;
    const direction =
        typeof env.type === "string" && OUTGOING_TYPES.has(env.type) ? "outgoing" : "incoming";
    const text = typeof env.content === "string" && env.content.length > 0 ? env.content : "";
    return { direction, text };
}
