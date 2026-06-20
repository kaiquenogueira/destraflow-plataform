/**
 * Backfill idempotente de aiLimitResetAt / aiMessagesUsed (Sprint 01).
 *
 * POR QUÊ: a nova lógica de quota (src/services/ai/ai-quota.ts) trata aiLimitResetAt
 * como a fronteira do período e a AVANÇA sob demanda. Tenants legados podem ter
 * aiLimitResetAt = NULL (nunca reseta) ou uma data no passado (resíduo do bug antigo).
 * Este script normaliza o estado inicial: para todo CrmUser role=USER cujo
 * aiLimitResetAt seja NULL ou já vencido, define aiLimitResetAt = 1º dia do próximo
 * mês (00:00 UTC) e zera aiMessagesUsed. Idempotente: rodar 2x não muda nada.
 *
 * RUNBOOK (deploy-gated — executar PÓS-deploy do código de quota):
 *   1. Garanta DATABASE_URL apontando para o CRM DB (central) no ambiente.
 *   2. Dry-run (não escreve):   npx tsx scripts/backfill-ai-reset.ts
 *   3. Revise a contagem reportada.
 *   4. Aplicar de fato:         npx tsx scripts/backfill-ai-reset.ts --apply
 *
 * Seguro reverter: a coluna é compatível com o código antigo e novo.
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

/** 1º dia do próximo mês às 00:00 UTC. */
function firstDayOfNextMonth(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

async function main() {
    const now = new Date();
    const target = firstDayOfNextMonth(now);

    console.log(`Backfill aiLimitResetAt — modo: ${APPLY ? "APPLY (escreve)" : "DRY-RUN (não escreve)"}`);
    console.log(`Alvo de reset: ${target.toISOString()}`);

    // Candidatos: role=USER com aiLimitResetAt NULL ou já vencido.
    const candidates = await prisma.crmUser.findMany({
        where: {
            role: "USER",
            OR: [{ aiLimitResetAt: null }, { aiLimitResetAt: { lt: now } }],
        },
        select: { id: true, aiLimitResetAt: true, aiMessagesUsed: true },
    });

    console.log(`Candidatos a normalizar: ${candidates.length}`);

    if (!APPLY) {
        console.log("Dry-run concluído. Nenhuma escrita. Rode com --apply para aplicar.");
        return;
    }

    let updated = 0;
    for (const user of candidates) {
        await prisma.crmUser.update({
            where: { id: user.id },
            data: { aiLimitResetAt: target, aiMessagesUsed: 0 },
        });
        updated++;
        process.stdout.write(".");
    }

    console.log(`\nBackfill concluído. Atualizados: ${updated}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
