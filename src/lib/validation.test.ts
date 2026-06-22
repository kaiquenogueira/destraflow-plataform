import { describe, it, expect } from "vitest";
import {
    nameSchema,
    phoneSchema,
    campaignTemplateSchema,
    templateContentSchema,
    SCHEDULE_MIN_LEAD_MS,
    SCHEDULE_ERROR_MESSAGE,
    isScheduledFarEnough,
} from "./validation";

describe("validation (regras compartilhadas client↔server)", () => {
    describe("nameSchema", () => {
        it("rejeita < 2 caracteres, aceita >= 2", () => {
            expect(nameSchema.safeParse("a").success).toBe(false);
            expect(nameSchema.safeParse("ab").success).toBe(true);
        });
    });

    describe("phoneSchema (load-bearing)", () => {
        it("aceita E.164 com e sem +", () => {
            expect(phoneSchema.safeParse("+5511999999999").success).toBe(true);
            expect(phoneSchema.safeParse("5511999999999").success).toBe(true);
        });
        it("rejeita inválidos", () => {
            expect(phoneSchema.safeParse("123").success).toBe(false);
            expect(phoneSchema.safeParse("abc").success).toBe(false);
            expect(phoneSchema.safeParse("").success).toBe(false);
        });
        it("mensagem única (não diverge entre client e server)", () => {
            const r = phoneSchema.safeParse("123");
            expect(r.success).toBe(false);
            if (!r.success) expect(r.error.issues[0].message).toBe("Telefone inválido (ex: +5511999999999)");
        });
    });

    describe("conteúdo mínimo", () => {
        it("campaignTemplateSchema e templateContentSchema exigem >= 10", () => {
            expect(campaignTemplateSchema.safeParse("curto").success).toBe(false);
            expect(campaignTemplateSchema.safeParse("texto longo o suficiente").success).toBe(true);
            expect(templateContentSchema.safeParse("curto").success).toBe(false);
            expect(templateContentSchema.safeParse("texto longo o suficiente").success).toBe(true);
        });
    });

    describe("janela de agendamento (load-bearing)", () => {
        it("constante é 9.5 minutos em ms", () => {
            expect(SCHEDULE_MIN_LEAD_MS).toBe(9.5 * 60 * 1000);
        });
        it("rejeita perto demais, aceita longe o suficiente", () => {
            expect(isScheduledFarEnough(new Date(Date.now() + 9 * 60 * 1000))).toBe(false);
            expect(isScheduledFarEnough(new Date(Date.now() + 11 * 60 * 1000))).toBe(true);
        });
        it("data inválida/vazia é rejeitada (porteiro de empty no client)", () => {
            expect(isScheduledFarEnough(new Date(""))).toBe(false);
        });
        it("mensagem de erro única exportada", () => {
            expect(SCHEDULE_ERROR_MESSAGE).toContain("10 minutos");
        });
    });
});
