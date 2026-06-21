/**
 * Remediação one-off: re-grava CrmUser.databaseUrl em ciphertext (Sprint 03).
 *
 * POR QUÊ: a verificação (check-databaseurl-ciphertext.ts) encontrou credenciais
 * de conexão gravadas em TEXTO PLANO. Antes de ativar decryptSecret (estrito), elas
 * precisam ser criptografadas, senão o tenant passa a lançar ao abrir o pool.
 *
 * O QUE FAZ: para todo CrmUser cujo databaseUrl seja NÃO-vazio e NÃO-ciphertext,
 * grava encrypt(databaseUrl). Usa a MESMA DATA_ENCRYPTION_KEY do app (do .env),
 * então o ciphertext é decifrável em runtime. Idempotente: já-ciphertext é ignorado;
 * string vazia é ignorada (é benigna — os sites de conexão guardam `if (!databaseUrl)`).
 *
 * SEGURANÇA: NUNCA loga o valor do databaseUrl. Reporta apenas { id, email, length }.
 *
 * RUNBOOK (deploy-gated — ANTES de ativar decryptSecret):
 *   1. DATABASE_URL -> CRM DB; DATA_ENCRYPTION_KEY = a chave de produção.
 *   2. Dry-run:  npx tsx scripts/encrypt-plaintext-databaseurl.ts
 *   3. Aplicar:  npx tsx scripts/encrypt-plaintext-databaseurl.ts --apply
 *   4. Confirmar: npx tsx scripts/check-databaseurl-ciphertext.ts  (deve dar 0 pendências)
 */

import { PrismaClient } from "@prisma/client";
import { encrypt, isCiphertext } from "../src/lib/encryption";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

if (!process.env.DATA_ENCRYPTION_KEY) {
    console.error("DATA_ENCRYPTION_KEY ausente — abortando (não dá para criptografar).");
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

async function main() {
    console.log(`Remediação databaseUrl — modo: ${APPLY ? "APPLY (escreve)" : "DRY-RUN (não escreve)"}`);

    const users = await prisma.crmUser.findMany({
        where: { databaseUrl: { not: null } },
        select: { id: true, email: true, databaseUrl: true },
    });

    // Alvos: databaseUrl não-vazio E não-ciphertext (plaintext real). Vazio é benigno.
    const targets = users.filter(
        (u) => typeof u.databaseUrl === "string" && u.databaseUrl !== "" && !isCiphertext(u.databaseUrl)
    );

    console.log(`Alvos (plaintext não-vazio): ${targets.length}`);
    for (const u of targets) {
        console.log(`  - ${u.id} <${u.email}> (len ${u.databaseUrl!.length})`);
    }

    if (!APPLY) {
        console.log("Dry-run concluído. Nenhuma escrita. Rode com --apply para criptografar.");
        return;
    }

    let updated = 0;
    for (const u of targets) {
        const ciphertext = encrypt(u.databaseUrl!); // mesma chave do app
        await prisma.crmUser.update({
            where: { id: u.id },
            data: { databaseUrl: ciphertext },
        });
        updated++;
        process.stdout.write(".");
    }

    console.log(`\nRemediação concluída. Criptografados: ${updated}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
