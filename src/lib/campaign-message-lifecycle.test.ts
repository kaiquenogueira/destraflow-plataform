import { afterEach, describe, expect, it, vi } from "vitest";
import {
    MAX_RETRIES,
    UNFINISHED_STATUSES,
    applyOutcome,
    calculateDelay,
    eligibleForSendWhere,
    unfinishedMessagesWhere,
} from "./campaign-message-lifecycle";

describe("campaign-message-lifecycle", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("applyOutcome", () => {
        const now = new Date("2024-01-01T00:00:00Z");

        it.each([
            [0, "SENT", 0, true],
            [5, "SENT", 5, true],
        ] as const)(
            "sent: retryCount %i → %s (retryCount unchanged, sentAt=now)",
            (current, status, retryCount, hasSentAt) => {
                const upd = applyOutcome(current, { kind: "sent" }, now);
                expect(upd.status).toBe(status);
                expect(upd.retryCount).toBe(retryCount);
                expect(upd.error).toBeNull();
                expect(upd.sentAt).toEqual(hasSentAt ? now : null);
            }
        );

        it.each([
            [0, "FAILED", 1],
            [1, "FAILED", 2],
            [2, "DEAD_LETTER", 3],
            [3, "DEAD_LETTER", 4],
        ] as const)(
            "error: retryCount %i → %s with retryCount %i, sentAt null",
            (current, status, retryCount) => {
                const upd = applyOutcome(current, { kind: "error", message: "x" }, now);
                expect(upd.status).toBe(status);
                expect(upd.retryCount).toBe(retryCount);
                expect(upd.sentAt).toBeNull();
            }
        );

        it("FAILED keeps the raw error message", () => {
            const upd = applyOutcome(0, { kind: "error", message: "boom" });
            expect(upd.status).toBe("FAILED");
            expect(upd.error).toBe("boom");
        });

        it("DEAD_LETTER wraps the error with the permanent-failure prefix and MAX_RETRIES", () => {
            const upd = applyOutcome(MAX_RETRIES - 1, { kind: "error", message: "boom" });
            expect(upd.status).toBe("DEAD_LETTER");
            expect(upd.error).toBe(`Falha permanente após ${MAX_RETRIES} tentativas: boom`);
        });

        it("crosses to DEAD_LETTER exactly when newRetryCount reaches MAX_RETRIES", () => {
            // último FAILED é em current = MAX_RETRIES - 2 (→ retryCount MAX_RETRIES - 1)
            expect(applyOutcome(MAX_RETRIES - 2, { kind: "error", message: "x" }).status).toBe("FAILED");
            expect(applyOutcome(MAX_RETRIES - 1, { kind: "error", message: "x" }).status).toBe("DEAD_LETTER");
        });
    });

    describe("calculateDelay", () => {
        it("never exceeds the 30s cap, for retryCount 0..6", () => {
            for (let rc = 0; rc <= 6; rc++) {
                expect(calculateDelay(rc)).toBeLessThanOrEqual(30000);
            }
        });

        it("hits the floor with minimal random (base=2000, jitter=0.8)", () => {
            vi.spyOn(Math, "random").mockReturnValue(0);
            // base=2000, backoff=2000*1.5^0=2000, jitter=2000*0.8=1600
            expect(calculateDelay(0)).toBeCloseTo(1600, 5);
        });

        it("caps high retryCount at 30000 even at the upper random bound", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.999999);
            expect(calculateDelay(5)).toBe(30000);
        });

        it("is approximately monotonic in retryCount with random fixed", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.5);
            const delays = [0, 1, 2, 3].map((rc) => calculateDelay(rc));
            for (let i = 1; i < delays.length; i++) {
                expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
            }
        });
    });

    describe("eligibility / terminality predicates", () => {
        it("eligibleForSendWhere matches PENDING and retryable FAILED at a fixed now", () => {
            const now = new Date("2024-01-01T00:00:00Z");
            expect(eligibleForSendWhere(now)).toEqual({
                OR: [
                    { status: "PENDING", scheduledAt: { lte: now } },
                    { status: "FAILED", retryCount: { lt: MAX_RETRIES }, scheduledAt: { lte: now } },
                ],
            });
        });

        it("unfinishedMessagesWhere = [PENDING, FAILED] (excludes PROCESSING, DEAD_LETTER, SENT)", () => {
            expect(unfinishedMessagesWhere()).toEqual({
                status: { in: ["PENDING", "FAILED"] },
            });
            expect(UNFINISHED_STATUSES).not.toContain("DEAD_LETTER");
            expect(UNFINISHED_STATUSES).not.toContain("SENT");
            // PROCESSING NÃO bloqueia conclusão: o worker nunca o re-seleciona, então
            // incluí-lo prenderia a campanha para sempre numa órfã. Ver invariante no módulo.
            expect(UNFINISHED_STATUSES).not.toContain("PROCESSING");
        });

        it("INVARIANTE: todo status que bloqueia conclusão é re-selecionável pelo worker", () => {
            // Regressão do achado high-sev: um status só pode estar em UNFINISHED_STATUSES se
            // eligibleForSendWhere consegue tirá-lo de lá — senão a campanha trava sem recuperação.
            const where = eligibleForSendWhere();
            const selectableStatuses = new Set(
                (where.OR ?? []).map((branch) => (branch as { status?: string }).status)
            );
            for (const status of UNFINISHED_STATUSES) {
                expect(selectableStatuses.has(status)).toBe(true);
            }
        });
    });
});
