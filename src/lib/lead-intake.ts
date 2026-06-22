import { canonicalizePhone } from "@/lib/phone";
import type { LeadTag } from "@/types";

/**
 * Intake de leads — dono ÚNICO do conceito "planilha → leads validados".
 *
 * Antes (Sprint 06) esse conceito vivia esfregado em dois módulos rasos que
 * compartilhavam conhecimento por CÓPIA, não por interface:
 *   - cliente (`lead-import.tsx`): header mapping + filtro `name || phone`,
 *     preview com valores CRUS;
 *   - servidor (`leads.ts`): validação estrita (`name>=2 E phone>=8`), regex,
 *     normalização de telefone, tradução de tag e dedup.
 * As duas metades DISCORDAVAM sobre "o que é uma linha válida" → o preview
 * mostrava linhas que o servidor rejeitava (linha-fantasma) e exibia telefone/tag
 * crus enquanto o servidor gravava a forma normalizada (preview mentia).
 *
 * Aqui as regras têm um só dono: `buildIntakePlan`. É PURO e SÍNCRONO — sem I/O,
 * sem DOM, sem Prisma. O dedup contra o banco entra por valor (`existingCanonicalPhones`),
 * não por injeção de repositório (resistir a essa costura prematura; ver nota do Sprint 06).
 * O cliente o chama sem `existingCanonicalPhones` (preview já normalizado, regras
 * idênticas às do servidor); o servidor o chama COM o conjunto vindo do DB.
 *
 * A identidade de telefone (`canonicalizePhone`) é CONSUMIDA do módulo do Sprint 02
 * (`@/lib/phone`), nunca reimplementada aqui.
 */

/** Linha crua da planilha, keyada pelos cabeçalhos originais (acento/caso preservados). */
export interface RawRow {
    [column: string]: string;
}

/** Lead pronto para inserção no Tenant DB (telefone já canônico, tag já traduzida). */
export interface IntakeLead {
    name: string;
    phone: string; // forma canônica (+55…)
    phoneNormalized: string; // espelha `phone`; alimenta o índice de identidade (Sprint 02)
    interest?: string;
    tag: LeadTag; // traduzida de PT → enum
}

export interface IntakeError {
    row: number; // número da linha na planilha (header = 1; 1ª linha de dados = 2)
    field: string; // "nome" | "telefone"
    message: string;
}

export type SkipReason = "duplicate-in-batch" | "duplicate-existing";

export interface IntakePlan {
    validLeads: IntakeLead[];
    errors: IntakeError[];
    skipped: Array<{ row: number; reason: SkipReason }>;
}

// Cap de linhas por importação. `buildIntakePlan` é puro e não lança; o teto (e o caso
// "nenhuma linha") é imposto pela casca em `importLeadsFromCSV` (que pode lançar).
export const MAX_IMPORT = 5000;

// Mapeamento de cabeçalhos PT → campo interno (acento-insensitive). Cópia ÚNICA.
const HEADER_MAP: Record<string, string> = {
    nome: "name",
    name: "name",
    telefone: "phone",
    phone: "phone",
    celular: "phone",
    whatsapp: "phone",
    interesse: "interest",
    interest: "interest",
    etapa: "tag",
    tag: "tag",
    status: "tag",
    fase: "tag",
};

// Cabeçalhos obrigatórios (ao menos um alias de cada grupo deve existir).
const REQUIRED_HEADERS = {
    name: ["nome", "name"],
    phone: ["telefone", "phone", "celular", "whatsapp"],
};

const VALID_TAGS: LeadTag[] = [
    "NEW",
    "QUALIFICATION",
    "PROSPECTING",
    "CALL",
    "MEETING",
    "RETURN",
    "LOST",
    "CUSTOMER",
];

// Nomes em português → enum. Acento-insensitive via chave já normalizada (upper, sem acento).
const PT_TAG_MAP: Record<string, LeadTag> = {
    NOVO: "NEW",
    QUALIFICACAO: "QUALIFICATION",
    PROSPECCAO: "PROSPECTING",
    LIGACAO: "CALL",
    REUNIAO: "MEETING",
    RETORNO: "RETURN",
    PERDIDO: "LOST",
    CLIENTE: "CUSTOMER",
};

// Validação de formato do telefone canônico (mesma regex do schema Zod de createLead).
const PHONE_FORMAT = /^\+?[1-9]\d{10,14}$/;

/** Normaliza um cabeçalho para comparação: trim + lowercase + remove acentos. */
export function normalizeHeaderKey(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/** Verifica se os cabeçalhos da planilha contêm ao menos um alias de nome e de telefone. */
export function validateHeaders(rawHeaders: string[]): { valid: boolean; missing: string[] } {
    const normalized = rawHeaders.map(normalizeHeaderKey);
    const missing: string[] = [];

    if (!REQUIRED_HEADERS.name.some((h) => normalized.includes(h))) missing.push("nome");
    if (!REQUIRED_HEADERS.phone.some((h) => normalized.includes(h))) missing.push("telefone");

    return { valid: missing.length === 0, missing };
}

/**
 * Mapeia uma linha crua (header → valor) para os campos internos, fazendo trim.
 * NÃO normaliza valores (telefone para +55 / tag para enum) — isso é responsabilidade
 * de `buildIntakePlan`, mantendo a separação "mapear header" vs. "normalizar valor".
 */
export function mapRowToLead(row: RawRow): {
    name?: string;
    phone?: string;
    interest?: string;
    tag?: string;
} {
    const mapped: Record<string, string> = {};

    for (const [rawKey, value] of Object.entries(row)) {
        const field = HEADER_MAP[normalizeHeaderKey(rawKey)];
        if (field && value) {
            mapped[field] = value.trim();
        }
    }

    return mapped;
}

/** Traduz uma tag crua (PT ou enum, qualquer caso/acento) para o enum LeadTag; default NEW. */
export function normalizeTag(raw: string | undefined): LeadTag {
    if (!raw) return "NEW";
    const upper = raw.trim().toUpperCase();
    if ((VALID_TAGS as string[]).includes(upper)) return upper as LeadTag;
    return PT_TAG_MAP[normalizeHeaderKey(raw).toUpperCase()] ?? "NEW";
}

/**
 * Núcleo profundo e PURO. Recebe linhas cruas + (opcional) telefones canônicos já
 * existentes no DB e devolve o plano completo de importação. Sem I/O, sem DOM, sem Prisma.
 *
 * Dono de TODAS as regras: header mapping, `name.length >= 2`, telefone canônico via
 * `canonicalizePhone`, validação de formato, tradução de tag, dedup in-batch e
 * (quando `existingCanonicalPhones` é passado) dedup de existência.
 *
 * Linhas totalmente vazias (sem nome E sem telefone, já APÓS trim) são ignoradas em
 * silêncio (equivale ao antigo filtro `name || phone` do cliente), não entram em `errors`.
 * Tightening intencional vs. o servidor legado: uma linha só-de-espaços (`"   "`)
 * agora é ignorada em vez de virar erro de nome — célula em branco não é linha real.
 */
export function buildIntakePlan(
    rows: RawRow[],
    opts?: { existingCanonicalPhones?: Set<string> }
): IntakePlan {
    const existing = opts?.existingCanonicalPhones;
    const validLeads: IntakeLead[] = [];
    const errors: IntakeError[] = [];
    const skipped: Array<{ row: number; reason: SkipReason }> = [];
    const seenInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
        const row = i + 2; // header = 1; primeira linha de dados = 2
        const mapped = mapRowToLead(rows[i]);

        // Linha completamente vazia → ignorar (não conta como erro).
        if (!mapped.name && !mapped.phone) continue;

        if (!mapped.name || mapped.name.length < 2) {
            errors.push({ row, field: "nome", message: "Nome é obrigatório (mín. 2 caracteres)" });
            continue;
        }

        if (!mapped.phone || mapped.phone.length < 8) {
            errors.push({ row, field: "telefone", message: "Telefone é obrigatório" });
            continue;
        }

        const canonical = canonicalizePhone(mapped.phone);

        if (!PHONE_FORMAT.test(canonical)) {
            errors.push({
                row,
                field: "telefone",
                message: `Formato inválido: "${mapped.phone}" → "${canonical}"`,
            });
            continue;
        }

        if (existing?.has(canonical)) {
            skipped.push({ row, reason: "duplicate-existing" });
            continue;
        }

        if (seenInBatch.has(canonical)) {
            skipped.push({ row, reason: "duplicate-in-batch" });
            continue;
        }

        seenInBatch.add(canonical);
        validLeads.push({
            name: mapped.name,
            phone: canonical,
            phoneNormalized: canonical,
            interest: mapped.interest || undefined,
            tag: normalizeTag(mapped.tag),
        });
    }

    return { validLeads, errors, skipped };
}
