/**
 * Quota de personalização por IA — dono único da regra.
 *
 * A regra "N reescritas por tenant/mês, com reset em aiLimitResetAt, contando 1
 * por reescrita" estava reimplementada e DIVERGENTE em 3 lugares (worker, action,
 * tenant). Este módulo concentra:
 *  - `canPersonalize`  — decisão PURA sobre o estado (aplica e AVANÇA o reset devido).
 *  - `recordPersonalization` — efeito: +1 no consumo no DB central (crmUser).
 *  - `applyReset` — efeito: zera consumo E avança aiLimitResetAt (o que `resetAIUsage`
 *    nunca fazia — bug secundário de reset que nunca avançava a data).
 *
 * Fronteira: o consumo vive no CRM DB (central), não no Tenant DB. Ver CONTEXT.md.
 */

import { prisma } from "@/lib/prisma";

export interface QuotaState {
    used: number;
    limit: number;
    resetAt: Date | null;
}

export interface QuotaDecision {
    allowed: boolean;
    reason: "ok" | "limit_reached";
    /** Estado já com reset aplicado (used zerado e resetAt avançado), se houve reset. */
    nextState: QuotaState;
    /** true se um novo período começou nesta avaliação. */
    didReset: boolean;
}

/** Avança a data de reset para o próximo período (mensal). */
export function nextResetAt(from: Date): Date {
    const d = new Date(from);
    d.setMonth(d.getMonth() + 1);
    return d;
}

/**
 * Decide se o tenant pode personalizar AGORA. Função PURA sobre QuotaState:
 * aplica o reset devido (zera `used` E avança `resetAt`) e compara contra `limit`.
 * Não toca no DB — o chamador persiste via applyReset/recordPersonalization.
 */
export function canPersonalize(state: QuotaState, now: Date = new Date()): QuotaDecision {
    let { used, resetAt } = state;
    const { limit } = state;
    let didReset = false;

    if (resetAt && now > resetAt) {
        used = 0;
        resetAt = nextResetAt(now);
        didReset = true;
    }

    const allowed = used < limit;
    return {
        allowed,
        reason: allowed ? "ok" : "limit_reached",
        nextState: { used, limit, resetAt },
        didReset,
    };
}

/** Superfície mínima de `crmUser.update` que as primitivas de quota precisam. */
export interface QuotaPrismaClient {
    crmUser: {
        update: (args: {
            where: { id: string };
            data: {
                aiMessagesUsed?: { increment: number } | { set: number };
                aiLimitResetAt?: { set: Date };
            };
        }) => Promise<unknown>;
    };
}

/** Persiste o consumo de 1 reescrita no DB central (crmUser). Atômico via increment. */
export async function recordPersonalization(
    userId: string,
    quotaPrisma: QuotaPrismaClient = prisma
): Promise<void> {
    await quotaPrisma.crmUser.update({
        where: { id: userId },
        data: { aiMessagesUsed: { increment: 1 } },
    });
}

/** Persiste o reset de período: zera o consumo E avança aiLimitResetAt. */
export async function applyReset(
    userId: string,
    resetAt: Date,
    quotaPrisma: QuotaPrismaClient = prisma
): Promise<void> {
    await quotaPrisma.crmUser.update({
        where: { id: userId },
        data: { aiMessagesUsed: { set: 0 }, aiLimitResetAt: { set: resetAt } },
    });
}
