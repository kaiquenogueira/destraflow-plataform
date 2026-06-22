/**
 * Migração ADITIVA e idempotente de schema: adiciona a coluna phone_normalized +
 * índice em `leads` e `users` (WhatsAppContact) de CADA Tenant DB (Sprint 02).
 *
 * POR QUÊ: não há prisma/migrations; o código do Sprint 02 (findContactByPhone/escritas/
 * fallback) referencia phone_normalized. Esta coluna precisa existir no Tenant DB ANTES
 * do código servir tráfego. NÃO usamos `prisma db push --accept-data-loss` (migrate-tenants.ts)
 * porque ele reconcilia o schema inteiro e poderia DROPAR colunas/tabelas legadas não
 * declaradas no schema. Aqui rodamos só DDL aditivo e idempotente.
 *
 * O QUE FAZ, por tenant (CrmUser role=USER com databaseUrl):
 *   ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT;
 *   CREATE INDEX IF NOT EXISTS "leads_phone_normalized_idx" ON "leads" ("phone_normalized");
 *   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT;
 *   CREATE INDEX IF NOT EXISTS "users_phone_normalized_idx" ON "users" ("phone_normalized");
 *
 * Idempotente (IF NOT EXISTS). Reversível: a coluna é nullable e aditiva (DROP COLUMN desfaz).
 * SEGURANÇA: nunca loga a connection string nem PII — só email do tenant e status.
 *
 * RUNBOOK:
 *   1. DATABASE_URL -> CRM DB; DATA_ENCRYPTION_KEY = chave de produção.
 *   2. Dry-run (não escreve; checa existência da coluna por tenant):
 *        npx tsx scripts/migrate-phone-normalized-schema.ts
 *   3. Aplicar:
 *        npx tsx scripts/migrate-phone-normalized-schema.ts --apply
 */

import "dotenv/config"; // PRIMEIRO: carrega .env antes de prisma.ts ler process.env no import
import { Client } from "pg";
import { prisma } from "../src/lib/prisma";
import { decryptSecret } from "../src/lib/encryption";

if (!process.env.DATA_ENCRYPTION_KEY) {
    console.error("DATA_ENCRYPTION_KEY ausente — abortando (não dá para decifrar databaseUrl).");
    process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const DDL: string[] = [
    `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT`,
    `CREATE INDEX IF NOT EXISTS "leads_phone_normalized_idx" ON "leads" ("phone_normalized")`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_normalized" TEXT`,
    `CREATE INDEX IF NOT EXISTS "users_phone_normalized_idx" ON "users" ("phone_normalized")`,
];

async function columnExists(client: Client, table: string): Promise<boolean> {
    const res = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'phone_normalized' LIMIT 1`,
        [table]
    );
    return (res.rowCount ?? 0) > 0;
}

async function migrateTenant(dbUrl: string, email: string): Promise<boolean> {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const beforeLeads = await columnExists(client, "leads");
        const beforeUsers = await columnExists(client, "users");

        if (!APPLY) {
            console.log(`  ${email}: leads.phone_normalized=${beforeLeads ? "OK" : "FALTA"}, users.phone_normalized=${beforeUsers ? "OK" : "FALTA"}`);
            return true;
        }

        for (const stmt of DDL) {
            await client.query(stmt);
        }
        console.log(`  ${email}: aplicado (leads antes=${beforeLeads}, users antes=${beforeUsers})`);
        return true;
    } catch (e) {
        const msg = e instanceof Error ? e.message : "erro desconhecido";
        console.error(`  ❌ ${email}: ${msg}`);
        return false;
    } finally {
        await client.end().catch(() => {});
    }
}

async function main() {
    console.log(`Migração schema phone_normalized — modo: ${APPLY ? "APPLY (escreve DDL)" : "DRY-RUN (só checa)"}`);

    const users = await prisma.crmUser.findMany({
        where: { role: "USER", databaseUrl: { not: null } },
        select: { email: true, databaseUrl: true },
    });
    console.log(`Tenants com databaseUrl: ${users.length}`);

    let ok = 0;
    let fail = 0;
    for (const user of users) {
        if (!user.databaseUrl) continue;
        let dbUrl: string;
        try {
            dbUrl = decryptSecret(user.databaseUrl);
        } catch {
            console.error(`  ❌ ${user.email}: databaseUrl não está em ciphertext — pulado`);
            fail++;
            continue;
        }
        const success = await migrateTenant(dbUrl, user.email);
        if (success) ok++;
        else fail++;
    }

    console.log(`\n${APPLY ? "Migração concluída" : "Dry-run concluído"}. OK: ${ok}, falhas: ${fail}`);
    if (!APPLY) console.log("Nenhuma escrita. Rode com --apply para aplicar o DDL.");
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
