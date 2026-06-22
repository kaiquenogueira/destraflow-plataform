import { describe, expect, it } from "vitest";
import {
    buildIntakePlan,
    mapRowToLead,
    normalizeHeaderKey,
    normalizeTag,
    validateHeaders,
    type RawRow,
} from "./lead-intake";

// Toda a lógica antes intestável (telefone BR, tradução de tag, dedup) atravessa aqui
// a costura PURA `buildIntakePlan` — sem mock de Prisma, sem DOM.

describe("normalizeHeaderKey", () => {
    it.each([
        ["  Nome  ", "nome"],
        ["TELEFONE", "telefone"],
        ["Qualificação", "qualificacao"],
        ["WhatsApp", "whatsapp"],
    ])("normaliza %j → %j", (input, expected) => {
        expect(normalizeHeaderKey(input)).toBe(expected);
    });
});

describe("validateHeaders", () => {
    it.each<[string[], boolean, string[]]>([
        [["Nome", "Telefone"], true, []],
        [["whatsapp", "name"], true, []],
        [["celular", "NOME", "Etapa"], true, []],
        [["fase", "celular"], false, ["nome"]], // celular=phone ok, mas fase≠name → falta nome
        [["nome"], false, ["telefone"]],
        [["telefone"], false, ["nome"]],
        [["foo", "bar"], false, ["nome", "telefone"]],
    ])("validateHeaders(%j) → valid=%s missing=%j", (headers, valid, missing) => {
        const r = validateHeaders(headers);
        expect(r.valid).toBe(valid);
        expect(r.missing).toEqual(missing);
    });
});

describe("mapRowToLead", () => {
    it("mapeia aliases e faz trim, ignorando colunas desconhecidas", () => {
        expect(
            mapRowToLead({ Nome: "  Ana  ", celular: " 11999999999 ", Etapa: "Reunião", lixo: "x" })
        ).toEqual({ name: "Ana", phone: "11999999999", tag: "Reunião" });
    });

    it("ignora valores vazios", () => {
        expect(mapRowToLead({ nome: "Ana", telefone: "" })).toEqual({ name: "Ana" });
    });

    it("mapeia aliases de tag menos óbvios (status, fase)", () => {
        expect(mapRowToLead({ nome: "Ana", status: "Cliente" })).toEqual({ name: "Ana", tag: "Cliente" });
        expect(mapRowToLead({ nome: "Ana", fase: "Perdido" })).toEqual({ name: "Ana", tag: "Perdido" });
    });
});

describe("normalizeTag", () => {
    it.each<[string | undefined, string]>([
        ["Qualificação", "QUALIFICATION"],
        ["qualificacao", "QUALIFICATION"],
        ["Prospecção", "PROSPECTING"],
        ["Reunião", "MEETING"],
        ["Ligação", "CALL"],
        ["Retorno", "RETURN"],
        ["Perdido", "LOST"],
        ["Novo", "NEW"],
        ["CUSTOMER", "CUSTOMER"],
        ["cliente", "CUSTOMER"],
        ["xpto", "NEW"],
        [undefined, "NEW"],
        ["", "NEW"],
    ])("normalizeTag(%j) → %s", (input, expected) => {
        expect(normalizeTag(input)).toBe(expected);
    });
});

describe("buildIntakePlan — telefone BR (6 ramos de canonicalização)", () => {
    it.each<[string, string]>([
        ["+5511999999999", "+5511999999999"], // passthrough +
        ["(11) 97777-7777", "+5511977777777"], // 11 dígitos → +55
        ["1133334444", "+551133334444"], // 10 dígitos → +55
        ["5511999999999", "+5511999999999"], // 13 dígitos prefixo 55 → +
        ["551133334444", "+551133334444"], // 12 dígitos prefixo 55 → +
    ])("phone %j vira válido com canônico %j", (raw, canonical) => {
        const plan = buildIntakePlan([{ nome: "Ana", telefone: raw }]);
        expect(plan.errors).toEqual([]);
        expect(plan.validLeads).toHaveLength(1);
        expect(plan.validLeads[0].phone).toBe(canonical);
        expect(plan.validLeads[0].phoneNormalized).toBe(canonical);
    });

    it("ramo fallback: dígitos insuficientes mas len>=8 → erro de formato", () => {
        const plan = buildIntakePlan([{ nome: "Ana", telefone: "12345678" }]);
        expect(plan.validLeads).toEqual([]);
        expect(plan.errors[0]).toMatchObject({ row: 2, field: "telefone" });
        expect(plan.errors[0].message).toContain("Formato inválido");
    });
});

describe("buildIntakePlan — regras de validade (corrige linha-fantasma)", () => {
    it("name preenchido + phone vazio → erro de telefone, NÃO em validLeads", () => {
        // O bug do filtro `name || phone`: o cliente mostrava como válido, o servidor rejeitava.
        const plan = buildIntakePlan([{ nome: "João", telefone: "" }]);
        expect(plan.validLeads).toEqual([]);
        expect(plan.errors).toEqual([{ row: 2, field: "telefone", message: "Telefone é obrigatório" }]);
    });

    it("name < 2 chars → erro de nome", () => {
        const plan = buildIntakePlan([{ nome: "A", telefone: "11999999999" }]);
        expect(plan.validLeads).toEqual([]);
        expect(plan.errors[0]).toMatchObject({ row: 2, field: "nome" });
    });

    it("phone com < 8 chars → erro de telefone", () => {
        const plan = buildIntakePlan([{ nome: "Ana", telefone: "12345" }]);
        expect(plan.errors[0]).toMatchObject({ row: 2, field: "telefone", message: "Telefone é obrigatório" });
    });

    it("linha totalmente vazia → ignorada (nem erro nem válida)", () => {
        const plan = buildIntakePlan([{ nome: "", telefone: "" }, { nome: "Ana", telefone: "11999999999" }]);
        expect(plan.errors).toEqual([]);
        expect(plan.skipped).toEqual([]);
        expect(plan.validLeads).toHaveLength(1);
        expect(plan.validLeads[0].name).toBe("Ana");
    });

    it("linha só-de-espaços → ignorada (tightening intencional vs. servidor legado)", () => {
        const plan = buildIntakePlan([{ nome: "   ", telefone: "   " }]);
        expect(plan.errors).toEqual([]);
        expect(plan.skipped).toEqual([]);
        expect(plan.validLeads).toEqual([]);
    });

    it("numera as linhas a partir de 2 (header = 1)", () => {
        const rows: RawRow[] = [
            { nome: "Ana", telefone: "11999999999" },
            { nome: "B", telefone: "11888888888" }, // erro de nome na linha 3
        ];
        expect(buildIntakePlan(rows).errors[0].row).toBe(3);
    });
});

describe("buildIntakePlan — dedup (in-batch e contra existentes)", () => {
    it("dois rows com mesmo número (formatos diferentes) → 1 válido, 1 duplicate-in-batch", () => {
        const plan = buildIntakePlan([
            { nome: "Ana", telefone: "11999999999" },
            { nome: "Ana 2", telefone: "+55 11 99999-9999" },
        ]);
        expect(plan.validLeads).toHaveLength(1);
        expect(plan.skipped).toEqual([{ row: 3, reason: "duplicate-in-batch" }]);
    });

    it("row cujo canônico está em existingCanonicalPhones → duplicate-existing", () => {
        const existingCanonicalPhones = new Set(["+5511977777777"]);
        const plan = buildIntakePlan([{ nome: "Ana", telefone: "(11) 97777-7777" }], {
            existingCanonicalPhones,
        });
        expect(plan.validLeads).toEqual([]);
        expect(plan.skipped).toEqual([{ row: 2, reason: "duplicate-existing" }]);
    });

    it("sem existingCanonicalPhones (caminho do preview cliente) → só dedup in-batch", () => {
        const plan = buildIntakePlan([{ nome: "Ana", telefone: "(11) 97777-7777" }]);
        expect(plan.validLeads).toHaveLength(1);
        expect(plan.skipped).toEqual([]);
    });
});

describe("buildIntakePlan — lead montado para inserção", () => {
    it("monta name/phone/phoneNormalized/interest/tag prontos para createMany", () => {
        const plan = buildIntakePlan([
            { Nome: "Ana", Telefone: "11999999999", Interesse: "Seguros", Etapa: "Qualificação" },
        ]);
        expect(plan.validLeads[0]).toEqual({
            name: "Ana",
            phone: "+5511999999999",
            phoneNormalized: "+5511999999999",
            interest: "Seguros",
            tag: "QUALIFICATION",
        });
    });

    it("interest ausente vira undefined; tag ausente vira NEW", () => {
        const plan = buildIntakePlan([{ nome: "Ana", telefone: "11999999999" }]);
        expect(plan.validLeads[0].interest).toBeUndefined();
        expect(plan.validLeads[0].tag).toBe("NEW");
    });
});
