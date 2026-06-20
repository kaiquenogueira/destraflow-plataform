import { describe, it, expect, vi } from "vitest";

// ai-quota.ts importa `prisma` (default das primitivas de efeito), cuja init exige
// DATABASE_URL. As primitivas testadas aqui recebem um quotaPrisma injetado, então o
// default mockado nunca é usado — o mock só evita o throw de init no import.
vi.mock("@/lib/prisma", () => ({
    prisma: { crmUser: { update: vi.fn() } },
}));

import {
    canPersonalize,
    nextResetAt,
    recordPersonalization,
    applyReset,
    type QuotaState,
} from "./ai-quota";

describe("ai-quota — canPersonalize (pura)", () => {
    const now = new Date("2026-06-20T12:00:00.000Z");

    it("permite quando used < limit e resetAt no futuro (sem reset)", () => {
        const state: QuotaState = { used: 5, limit: 15, resetAt: new Date("2026-07-01T00:00:00.000Z") };
        const d = canPersonalize(state, now);
        expect(d.allowed).toBe(true);
        expect(d.reason).toBe("ok");
        expect(d.didReset).toBe(false);
        expect(d.nextState.used).toBe(5);
        expect(d.nextState.resetAt).toEqual(state.resetAt); // inalterado
    });

    it("bloqueia quando used == limit e resetAt no futuro (sem reset)", () => {
        const state: QuotaState = { used: 15, limit: 15, resetAt: new Date("2026-07-01T00:00:00.000Z") };
        const d = canPersonalize(state, now);
        expect(d.allowed).toBe(false);
        expect(d.reason).toBe("limit_reached");
        expect(d.didReset).toBe(false);
        expect(d.nextState.used).toBe(15);
    });

    it("aplica e AVANÇA o reset quando resetAt venceu — volta a permitir (bug ao vivo)", () => {
        const state: QuotaState = { used: 15, limit: 15, resetAt: new Date("2026-06-01T00:00:00.000Z") };
        const d = canPersonalize(state, now);
        expect(d.didReset).toBe(true);
        expect(d.allowed).toBe(true);
        expect(d.nextState.used).toBe(0);
        // resetAt avança para +1 mês a partir de `now` (não fica no passado)
        expect(d.nextState.resetAt).toEqual(nextResetAt(now));
    });

    it("permite com resetAt null (nunca reseta, não bloqueia abaixo do limite)", () => {
        const state: QuotaState = { used: 0, limit: 15, resetAt: null };
        const d = canPersonalize(state, now);
        expect(d.allowed).toBe(true);
        expect(d.didReset).toBe(false);
        expect(d.nextState.resetAt).toBeNull();
    });
});

describe("ai-quota — efeitos (quotaPrisma mockado)", () => {
    function makeQuotaPrisma() {
        return { crmUser: { update: vi.fn().mockResolvedValue({}) } };
    }

    it("recordPersonalization incrementa aiMessagesUsed em 1", async () => {
        const qp = makeQuotaPrisma();
        await recordPersonalization("user-1", qp);
        expect(qp.crmUser.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: { aiMessagesUsed: { increment: 1 } },
        });
    });

    it("applyReset zera o consumo E avança aiLimitResetAt", async () => {
        const qp = makeQuotaPrisma();
        const resetAt = new Date("2026-07-20T12:00:00.000Z");
        await applyReset("user-1", resetAt, qp);
        expect(qp.crmUser.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: { aiMessagesUsed: { set: 0 }, aiLimitResetAt: { set: resetAt } },
        });
    });
});
