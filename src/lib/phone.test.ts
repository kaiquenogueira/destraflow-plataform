import { describe, expect, it, vi } from "vitest";
import { canonicalizePhone, samePhone, findContactByPhone, findLeadByPhone } from "./phone";

describe("canonicalizePhone", () => {
    it.each([
        ["+5511999999999", "+5511999999999"],
        ["5511999999999", "+5511999999999"],
        ["(11) 99999-9999", "+5511999999999"],
        ["11999999999", "+5511999999999"],
        ["+55 11 99999-9999", "+5511999999999"],
        ["55 11 9999-9999", "+551199999999"], // fixo, 10 dígitos
    ])("canonicaliza %j → %j", (input, expected) => {
        expect(canonicalizePhone(input)).toBe(expected);
    });

    it("é idempotente (canonicalizar a saída não muda nada)", () => {
        const once = canonicalizePhone("(11) 99999-9999");
        expect(canonicalizePhone(once)).toBe(once);
    });

    it("não quebra com entrada vazia", () => {
        expect(canonicalizePhone("")).toBe("+");
    });
});

describe("samePhone", () => {
    it.each([
        ["+5511999999999", "5511999999999", true], // hoje (where exato) retorna false → bug
        ["+5511999999999", "(11) 99999-9999", true],
        ["11999999999", "+5511999999999", true],
        ["+5511999999999", "+5511888888888", false],
    ])("samePhone(%j, %j) === %s", (a, b, expected) => {
        expect(samePhone(a, b)).toBe(expected);
    });

    it("falsy de qualquer lado → false", () => {
        expect(samePhone(null, "+5511999999999")).toBe(false);
        expect(samePhone("+5511999999999", undefined)).toBe(false);
        expect(samePhone("", "")).toBe(false);
    });
});

// Stub mínimo do tenantPrisma: cada teste controla o que findFirst/findMany retornam,
// e a DECISÃO de match (samePhone no fallback) fica observável na borda do módulo —
// ao contrário dos mocks antigos que devolviam um contato canned ignorando a where-clause.
function makeTenantPrisma(overrides: {
    contactFindFirst?: unknown;
    contactFindMany?: unknown[];
    leadFindFirst?: unknown;
    leadFindMany?: unknown[];
}) {
    return {
        whatsAppContact: {
            findFirst: vi.fn().mockResolvedValue(overrides.contactFindFirst ?? null),
            findMany: vi.fn().mockResolvedValue(overrides.contactFindMany ?? []),
        },
        lead: {
            findFirst: vi.fn().mockResolvedValue(overrides.leadFindFirst ?? null),
            findMany: vi.fn().mockResolvedValue(overrides.leadFindMany ?? []),
        },
    } as any;
}

describe("findContactByPhone", () => {
    it("caminho rápido: usa o lookup indexado por phoneNormalized", async () => {
        const hit = { id: 7, whatsapp: "+5511999999999", phoneNormalized: "+5511999999999" };
        const tp = makeTenantPrisma({ contactFindFirst: hit });

        const result = await findContactByPhone(tp, "(11) 99999-9999");

        expect(tp.whatsAppContact.findFirst).toHaveBeenCalledWith({
            where: { phoneNormalized: "+5511999999999" },
            orderBy: { id: "asc" },
        });
        expect(result).toBe(hit);
        expect(tp.whatsAppContact.findMany).not.toHaveBeenCalled();
    });

    it("fallback legado: escolhe o contato certo entre vários phoneNormalized=null via samePhone", async () => {
        const tp = makeTenantPrisma({
            contactFindFirst: null,
            contactFindMany: [
                { id: 1, whatsapp: "+5511888888888", phoneNormalized: null },
                { id: 2, whatsapp: "5511999999999", phoneNormalized: null }, // cru → casa
                { id: 3, whatsapp: "+5511777777777", phoneNormalized: null },
            ],
        });

        const result = await findContactByPhone(tp, "+5511999999999");

        // Fallback pré-filtra no banco por sufixo de dígitos (não varre a tabela toda) + orderBy estável.
        expect(tp.whatsAppContact.findMany).toHaveBeenCalledWith({
            where: { phoneNormalized: null, whatsapp: { contains: "99999999" } },
            orderBy: { id: "asc" },
        });
        expect(result).toMatchObject({ id: 2 });
    });

    it("retorna null quando nada casa (nem indexado nem legado)", async () => {
        const tp = makeTenantPrisma({
            contactFindFirst: null,
            contactFindMany: [{ id: 1, whatsapp: "+5511888888888", phoneNormalized: null }],
        });
        expect(await findContactByPhone(tp, "+5511999999999")).toBeNull();
    });
});

describe("findLeadByPhone", () => {
    it("caminho rápido por phoneNormalized", async () => {
        const hit = { id: "lead-1", phone: "+5511999999999", phoneNormalized: "+5511999999999" };
        const tp = makeTenantPrisma({ leadFindFirst: hit });

        const result = await findLeadByPhone(tp, "5511999999999");

        expect(tp.lead.findFirst).toHaveBeenCalledWith({
            where: { phoneNormalized: "+5511999999999" },
            orderBy: { id: "asc" },
        });
        expect(result).toBe(hit);
    });

    it("fallback legado casa lead cru por samePhone", async () => {
        const tp = makeTenantPrisma({
            leadFindFirst: null,
            leadFindMany: [
                { id: "a", phone: "5511888888888", phoneNormalized: null },
                { id: "b", phone: "11999999999", phoneNormalized: null }, // casa
            ],
        });
        const result = await findLeadByPhone(tp, "+5511999999999");
        expect(result).toMatchObject({ id: "b" });
    });
});
