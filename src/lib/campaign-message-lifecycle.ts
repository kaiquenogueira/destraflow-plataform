/**
 * Ciclo de vida de CampaignMessage — dono único da máquina de estados.
 *
 * Antes (Sprint 04), o ciclo de vida vivia só como statements imperativos colados a
 * I/O dentro de `processTenantMessages` (worker.ts), com "elegível", "terminal" e o cap
 * de retries reexpressos em ≥4 call sites DIVERGENTES (query do worker, `where` de
 * `updateCampaignStatuses`, e as ações de cancel/retry). Como nenhum era dono, eles
 * já discordavam — drift latente de conclusão de campanha. Aqui a regra mora UMA vez:
 *  - `MAX_RETRIES`           — cap de tentativas (fonte única).
 *  - `eligibleForSendWhere`  — `where` do que o worker deve buscar p/ enviar.
 *  - `unfinishedMessagesWhere` — `where` do que ainda impede a campanha de concluir.
 *  - `applyOutcome`          — decisão PURA (sem I/O) SENT/FAILED/DEAD_LETTER.
 *  - `calculateDelay`        — backoff + jitter, isolado p/ ganhar superfície de teste.
 *
 * Invariante de segurança — `UNFINISHED_STATUSES` ⊆ recuperável-pelo-worker:
 *   Um status só pode BLOQUEAR a conclusão se o worker conseguir tirá-lo de lá. O worker
 *   só re-seleciona o que `eligibleForSendWhere` retorna (PENDING + FAILED<MAX). Logo a
 *   lista de "não concluído" deve conter apenas estados que o worker drena.
 *
 *   - PROCESSING fica de FORA. É marcado fora do try (antes do envio) e NÃO é re-selecionado
 *     por `eligibleForSendWhere` — não há caminho de recuperação. Se o cron for morto
 *     (timeout/crash) entre a marca PROCESSING e a transição terminal, a mensagem fica
 *     órfã. Incluí-la aqui prenderia a campanha em PROCESSING PARA SEMPRE. Excluí-la
 *     reproduz o contrato deliberado do código original (`[PENDING, FAILED]`): a campanha
 *     auto-cura e conclui; a mensagem órfã é perdida (gap pré-existente, fora de escopo —
 *     `updatedAt` já existe e habilitaria um requeue por janela em sprint futura).
 *   - DEAD_LETTER fica de FORA: é TERMINAL para conclusão. A campanha COMPLETA mesmo com
 *     dead letters; ficam visíveis e reentráveis manualmente via `retryCampaignDeadLetters`
 *     / `retryDeadLetterMessage`, que reabrem a campanha (COMPLETED → PROCESSING). Incluí-lo
 *     tornaria esse ramo de reabertura código morto e prenderia o painel.
 *   - FAILED entra. `applyOutcome` garante que FAILED só persiste com retryCount<MAX (no cap
 *     vira DEAD_LETTER), então todo FAILED aqui é re-selecionável pelo worker. Linhas
 *     legadas FAILED-no-cap (bug #2) somem com o backfill opcional do Sprint 04.
 */

import type { Prisma } from "@/generated/prisma/tenant";

export const MAX_RETRIES = 3;

export type CampaignMessageStatus =
    | "PENDING"
    | "PROCESSING"
    | "SENT"
    | "FAILED"
    | "DEAD_LETTER";

/**
 * Status que ainda exigem trabalho para a campanha ser considerada concluída.
 * Apenas estados que o worker re-seleciona via `eligibleForSendWhere` (ver invariante no
 * topo): PROCESSING e DEAD_LETTER são deliberadamente omitidos.
 */
export const UNFINISHED_STATUSES: CampaignMessageStatus[] = [
    "PENDING",
    "FAILED",
];

/** `where` de elegibilidade para o worker buscar (exige `scheduledAt <= now`). */
export function eligibleForSendWhere(now: Date = new Date()): Prisma.CampaignMessageWhereInput {
    return {
        OR: [
            { status: "PENDING", scheduledAt: { lte: now } },
            { status: "FAILED", retryCount: { lt: MAX_RETRIES }, scheduledAt: { lte: now } },
        ],
    };
}

/** `where` de "campanha ainda não concluída". Decide o cálculo de COMPLETED. */
export function unfinishedMessagesWhere(): Prisma.CampaignMessageWhereInput {
    return { status: { in: UNFINISHED_STATUSES } };
}

export type SendOutcome =
    | { kind: "sent" }
    | { kind: "error"; message: string };

export interface MessageUpdate {
    status: Extract<CampaignMessageStatus, "SENT" | "FAILED" | "DEAD_LETTER">;
    retryCount: number;
    error: string | null;
    sentAt: Date | null;
}

/**
 * Decisão PURA: dado o retryCount atual e o resultado do envio, qual update aplicar.
 * Sem I/O — o chamador (worker) aplica o resultado no Prisma. Esta é a única fonte da
 * regra FAILED-vs-DEAD_LETTER e do cálculo de SENT, antes inlined no worker.
 */
export function applyOutcome(
    currentRetryCount: number,
    outcome: SendOutcome,
    now: Date = new Date(),
): MessageUpdate {
    if (outcome.kind === "sent") {
        return { status: "SENT", retryCount: currentRetryCount, error: null, sentAt: now };
    }

    const newRetryCount = (currentRetryCount ?? 0) + 1;
    if (newRetryCount >= MAX_RETRIES) {
        return {
            status: "DEAD_LETTER",
            retryCount: newRetryCount,
            error: `Falha permanente após ${MAX_RETRIES} tentativas: ${outcome.message}`,
            sentAt: null,
        };
    }
    return { status: "FAILED", retryCount: newRetryCount, error: outcome.message, sentAt: null };
}

/**
 * Calcula delay com backoff exponencial + jitter para evitar detecção.
 * Base: 2-8s para a primeira tentativa, escala com `retryCount`. Cap em 30s.
 * Movido do worker p/ ganhar superfície de teste própria (limites, cap, monotonicidade).
 */
export function calculateDelay(retryCount: number): number {
    const baseMin = 2000;
    const baseMax = 8000;
    const base = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
    const backoff = base * Math.pow(1.5, retryCount);
    // Jitter: ±20%
    const jitter = backoff * (0.8 + Math.random() * 0.4);
    return Math.min(jitter, 30000); // Cap em 30s
}
