/**
 * Verificação one-off: quais CrmUser.databaseUrl NÃO estão em ciphertext? (Sprint 03)
 *
 * POR QUÊ: ao trocar a resolução de conexão para decryptSecret (estrito), qualquer
 * databaseUrl gravado em texto plano passará a LANÇAR em vez de abrir um pool. Antes
 * do deploy dessa troca, rode este script no CRM DB para descobrir registros legados
 * e re-gravá-los criptografados (via fluxo de admin updateUser, que já chama encrypt).
 *
 * SEGURANÇA: NÃO decifra e NÃO loga o valor de databaseUrl. Reporta apenas
 * { id, email, ok } onde ok = isCiphertext(databaseUrl).
 *
 * RUNBOOK (deploy-gated — executar ANTES de trocar os sites para decryptSecret):
 *   1. DATABASE_URL apontando para o CRM DB (central).
 *   2. npx tsx scripts/check-databaseurl-ciphertext.ts
 *   3. Para cada { ok: false }, re-gravar via admin updateUser (re-encripta) ou backfill.
 *   4. Só então fazer o deploy do código que usa decryptSecret.
 */

import { PrismaClient } from "@prisma/client";
import { isCiphertext } from "../src/lib/encryption";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const users = await prisma.crmUser.findMany({
        where: { databaseUrl: { not: null } },
        select: { id: true, email: true, databaseUrl: true },
    });

    const report = users.map((u) => ({
        id: u.id,
        email: u.email,
        ok: isCiphertext(u.databaseUrl ?? ""),
    }));

    const failing = report.filter((r) => !r.ok);

    console.log(`Total com databaseUrl: ${report.length}`);
    console.log(`Em ciphertext (ok): ${report.length - failing.length}`);
    console.log(`NÃO ciphertext (precisa re-gravar): ${failing.length}`);

    if (failing.length > 0) {
        console.log("\nRegistros a corrigir (sem expor o valor):");
        for (const r of failing) {
            console.log(`  - ${r.id} <${r.email}>`);
        }
        process.exitCode = 1; // sinaliza pendência para o runbook/CI
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
