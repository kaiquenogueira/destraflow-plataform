/**
 * Backfill idempotente de phoneNormalized em Lead e WhatsAppContact (Sprint 02).
 *
 * POR QUÊ: a identidade de telefone (src/lib/phone.ts) casa lead ↔ contato pela
 * coluna canônica `phoneNormalized`. Linhas legadas têm `phoneNormalized = NULL` e só
 * casam pelo fallback lento (varredura + samePhone em JS). Este script recalcula
 * `phoneNormalized = canonicalizePhone(valor cru)` para regularizar os dados — depois
 * dele o match vira lookup indexado e o fallback de leitura pode ser removido.
 *
 * O QUE FAZ: para cada CrmUser role=USER com databaseUrl, abre o Tenant DB e:
 *   - Lead: preenche phoneNormalized = canonicalizePhone(phone) onde diverge.
 *   - WhatsAppContact: idem (pula whatsapp = NULL).
 *   - DETECTA colisões: vários contatos colapsando no MESMO phoneNormalized (histórico
 *     fragmentado). Apenas LOGA para merge manual — NÃO mescla (decisão de produto,
 *     arrisca corromper conversas). Ver Sprint 02 "Riscos & migração".
 *
 * Idempotente: rodar 2x não muda nada (só escreve onde phoneNormalized diverge).
 * SEGURANÇA: nunca loga a connection string; telefones são PII — loga só contagens e
 * (em colisão) ids + a forma canônica, necessária para o merge manual.
 *
 * RUNBOOK (deploy-gated — PÓS-deploy do código que escreve phoneNormalized):
 *   0. Aplique o schema do tenant em TODOS os Tenant DBs ANTES de rodar este backfill —
 *      a coluna phone_normalized + índice precisam existir, senão o SELECT aqui lança por
 *      tenant. Não há prisma/migrations: o schema do tenant é propagado via
 *      `npx tsx scripts/migrate-tenants.ts` (prisma db push de schema.tenant.prisma).
 *   1. DATABASE_URL -> CRM DB (central); DATA_ENCRYPTION_KEY = a chave de produção.
 *   2. Dry-run (não escreve):  npx tsx scripts/backfill-phone-normalized.ts
 *   3. Revise contagens + colisões reportadas.
 *   4. Aplicar de fato:        npx tsx scripts/backfill-phone-normalized.ts --apply
 *
 * Ordem completa: (1) schema nos Tenant DBs → (2) deploy do app que escreve phoneNormalized
 * → (3) dry-run → (4) --apply.
 */

import "dotenv/config"; // PRIMEIRO: carrega .env antes de prisma.ts ler process.env no import
import { Client } from "pg";
import { prisma } from "../src/lib/prisma";
import { decryptSecret } from "../src/lib/encryption";
import { canonicalizePhone } from "../src/lib/phone";

if (!process.env.DATA_ENCRYPTION_KEY) {
    console.error("DATA_ENCRYPTION_KEY ausente — abortando (não dá para decifrar databaseUrl).");
    process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const CHUNK = 500; // linhas por UPDATE em lote (poucos round-trips → conexão remota não cai)

interface TenantStats {
    leadsUpdated: number;
    contactsUpdated: number;
    contactCollisions: number;
}

/**
 * Aplica `phone_normalized` em lote via UPDATE ... FROM (VALUES ...) — ~N/CHUNK queries
 * em vez de uma por linha (o loop por-linha derrubava a conexão remota em tenants grandes).
 * `idCastInt`: a tabela `users` tem id inteiro; `leads` tem id texto (cuid).
 */
async function bulkUpdate(
    client: Client,
    table: string,
    idCastInt: boolean,
    rows: Array<{ id: string; pn: string }>
): Promise<void> {
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const tuples: string[] = [];
        const params: string[] = [];
        chunk.forEach((r, j) => {
            tuples.push(`($${j * 2 + 1}::text, $${j * 2 + 2}::text)`);
            params.push(r.id, r.pn);
        });
        const idMatch = idCastInt ? "t.id = v.id::int" : "t.id = v.id";
        const sql =
            `UPDATE "${table}" AS t SET "phone_normalized" = v.pn ` +
            `FROM (VALUES ${tuples.join(",")}) AS v(id, pn) WHERE ${idMatch}`;
        await client.query(sql, params);
    }
}

async function backfillTenant(name: string, dbUrl: string): Promise<TenantStats> {
    const stats: TenantStats = { leadsUpdated: 0, contactsUpdated: 0, contactCollisions: 0 };
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
        // --- Leads (id texto) ---
        const leads = await client.query<{ id: string; phone: string; phone_normalized: string | null }>(
            `SELECT "id", "phone", "phone_normalized" FROM "leads"`
        );
        const leadUpdates = leads.rows
            .map((l) => ({ id: l.id, pn: canonicalizePhone(l.phone) }))
            .filter((u, idx) => leads.rows[idx].phone_normalized !== u.pn);
        stats.leadsUpdated = leadUpdates.length;
        if (APPLY && leadUpdates.length) await bulkUpdate(client, "leads", false, leadUpdates);

        // --- WhatsAppContacts (tabela "users", id inteiro) ---
        const contacts = await client.query<{ id: number; whatsapp: string | null; phone_normalized: string | null }>(
            `SELECT "id", "whatsapp", "phone_normalized" FROM "users"`
        );
        const byCanonical = new Map<string, number[]>();
        const contactUpdates: Array<{ id: string; pn: string }> = [];
        for (const c of contacts.rows) {
            if (!c.whatsapp) continue; // sem número → nada a normalizar
            const canonical = canonicalizePhone(c.whatsapp);
            const ids = byCanonical.get(canonical) ?? [];
            ids.push(c.id);
            byCanonical.set(canonical, ids);
            if (c.phone_normalized !== canonical) contactUpdates.push({ id: String(c.id), pn: canonical });
        }
        stats.contactsUpdated = contactUpdates.length;
        if (APPLY && contactUpdates.length) await bulkUpdate(client, "users", true, contactUpdates);

        for (const [canonical, ids] of byCanonical) {
            if (ids.length > 1) {
                stats.contactCollisions++;
                console.warn(
                    `  ⚠️ colisão de contato em ${name}: ${ids.length} contatos → ${canonical} (ids: ${ids.join(", ")}) — merge manual de histórico necessário`
                );
            }
        }
    } finally {
        await client.end().catch(() => {});
    }
    return stats;
}

async function main() {
    console.log(`Backfill phoneNormalized — modo: ${APPLY ? "APPLY (escreve)" : "DRY-RUN (não escreve)"}`);

    const tenants = await prisma.crmUser.findMany({
        where: { role: "USER", databaseUrl: { not: null } },
        select: { name: true, databaseUrl: true },
    });
    console.log(`Tenants a processar: ${tenants.length}`);

    const totals: TenantStats = { leadsUpdated: 0, contactsUpdated: 0, contactCollisions: 0 };

    for (const tenant of tenants) {
        if (!tenant.databaseUrl) continue;
        let dbUrl: string;
        try {
            dbUrl = decryptSecret(tenant.databaseUrl);
        } catch {
            console.error(`  ❌ ${tenant.name}: databaseUrl não está em ciphertext — pulado`);
            continue;
        }
        try {
            const s = await backfillTenant(tenant.name, dbUrl);
            totals.leadsUpdated += s.leadsUpdated;
            totals.contactsUpdated += s.contactsUpdated;
            totals.contactCollisions += s.contactCollisions;
            console.log(
                `  ${tenant.name}: leads ${s.leadsUpdated}, contatos ${s.contactsUpdated}, colisões ${s.contactCollisions}`
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : "erro desconhecido";
            console.error(`  ❌ ${tenant.name} falhou: ${msg}`);
        }
    }

    console.log(
        `\n${APPLY ? "Backfill concluído" : "Dry-run concluído"}. ` +
        `Totais — leads: ${totals.leadsUpdated}, contatos: ${totals.contactsUpdated}, colisões: ${totals.contactCollisions}`
    );
    if (!APPLY) console.log("Nenhuma escrita. Rode com --apply para aplicar.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(process.exitCode ?? 0);
    });
