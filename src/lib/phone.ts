import type { getTenantPrisma } from "@/lib/prisma";

/**
 * Identidade de telefone — dono único da decisão "esses dois números são o mesmo?".
 *
 * Antes (Sprint 02), essa decisão vivia inline em ~5 where-clauses de igualdade EXATA
 * do Prisma, com três representações incompatíveis em circulação (dígitos puros para
 * dedup, `+55…` para import, cru para escrita manual/worker/N8N). Resultado: a junção
 * lead ↔ WhatsAppContact falhava por divergência de formato e o histórico de chat
 * sumia da UI. Aqui a forma canônica é definida UMA vez e o match é encapsulado.
 *
 * Forma canônica = E.164 simplificado para BR (assume DDI 55 quando ausente, igual ao
 * comportamento legado de `normalizePhone`). Internacionalização robusta (DDI ≠ 55)
 * fica para depois — não embutir agora seria mudar o contrato vigente.
 */

type TenantPrisma = ReturnType<typeof getTenantPrisma>;

/**
 * Canonicaliza um telefone para a forma única armazenada/comparada.
 * Ex.: "(11) 99999-9999", "5511999999999", "+55 11 99999-9999" → "+5511999999999".
 * Conservadora: na dúvida só prefixa "+" e deixa a validação de formato (regex Zod)
 * a cargo do chamador. Herdada de `normalizePhone` (antiga, privada a leads.ts).
 */
export function canonicalizePhone(raw: string): string {
    // Remove tudo que não é dígito ou +
    const phone = (raw ?? "").replace(/[^\d+]/g, "");

    // Se já começa com +, manter (assume-se DDI presente)
    if (phone.startsWith("+")) {
        return phone;
    }

    // 10-11 dígitos (BR sem código de país) → adiciona +55
    if (phone.length >= 10 && phone.length <= 11) {
        return `+55${phone}`;
    }

    // 12-13 dígitos começando com 55 (BR com DDI cru) → adiciona +
    if ((phone.length === 12 || phone.length === 13) && phone.startsWith("55")) {
        return `+${phone}`;
    }

    // Demais casos: prefixa + para validação posterior do chamador
    return `+${phone}`;
}

/**
 * True se dois telefones representam o mesmo número, independente de formatação.
 * Equivale a `canonicalizePhone(a) === canonicalizePhone(b)`. Falsy de qualquer lado → false.
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    return canonicalizePhone(a) === canonicalizePhone(b);
}

/**
 * Busca o WhatsAppContact cujo telefone canônico casa com `phone`.
 * Encapsula a decisão de match — nenhum chamador escreve `where { whatsapp }` na mão.
 *
 * 1. Caminho rápido: lookup indexado por `phoneNormalized` (linhas escritas/backfilladas).
 * 2. Fallback de migração: varre apenas linhas legadas (`phoneNormalized = null`) e casa
 *    em JS via `samePhone` — torna a decisão de match OBSERVÁVEL na borda do módulo
 *    (testável sem DB real). Some após o backfill; removível no passo final do Sprint 02.
 */
export async function findContactByPhone(tenantPrisma: TenantPrisma, phone: string) {
    const canonical = canonicalizePhone(phone);

    // orderBy estável: phoneNormalized é índice NÃO-único; em colisão (vários contatos →
    // mesmo número, ainda não mesclados) sempre devolve a MESMA linha, p/ a UI não alternar.
    const direct = await tenantPrisma.whatsAppContact.findFirst({
        where: { phoneNormalized: canonical },
        orderBy: { id: "asc" },
    });
    if (direct) return direct;

    // Fallback de migração (linhas legadas com phoneNormalized=null). Pré-filtra por
    // sufixo de dígitos NO BANCO para não materializar a tabela inteira na janela pré-backfill
    // (quando legado = todas as linhas); samePhone é o árbitro final do match.
    const suffix = digitSuffix(canonical);
    if (!suffix) return null;
    const legacy = await tenantPrisma.whatsAppContact.findMany({
        where: { phoneNormalized: null, whatsapp: { contains: suffix } },
        orderBy: { id: "asc" },
    });
    return legacy.find((c) => samePhone(c.whatsapp, phone)) ?? null;
}

/**
 * Busca o Lead cujo telefone canônico casa com `phone`. Mesma estratégia de
 * `findContactByPhone` (lookup indexado + fallback legado observável).
 */
export async function findLeadByPhone(tenantPrisma: TenantPrisma, phone: string) {
    const canonical = canonicalizePhone(phone);

    const direct = await tenantPrisma.lead.findFirst({
        where: { phoneNormalized: canonical },
        orderBy: { id: "asc" },
    });
    if (direct) return direct;

    const suffix = digitSuffix(canonical);
    if (!suffix) return null;
    const legacy = await tenantPrisma.lead.findMany({
        where: { phoneNormalized: null, phone: { contains: suffix } },
        orderBy: { id: "asc" },
    });
    return legacy.find((l) => samePhone(l.phone, phone)) ?? null;
}

/** Últimos 8 dígitos de um telefone — discriminador barato e robusto a +55/DDI para
 *  pré-filtrar o fallback no banco. Vazio se não há dígitos (entrada degenerada). */
function digitSuffix(phone: string): string {
    return phone.replace(/\D/g, "").slice(-8);
}
