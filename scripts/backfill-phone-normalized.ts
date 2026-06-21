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

import * as dotenv from "dotenv";
import { prisma, getTenantPrisma } from "../src/lib/prisma";
import { canonicalizePhone } from "../src/lib/phone";

dotenv.config();

if (!process.env.DATA_ENCRYPTION_KEY) {
    console.error("DATA_ENCRYPTION_KEY ausente — abortando (getTenantPrisma decifra o databaseUrl).");
    process.exit(1);
}

const APPLY = process.argv.includes("--apply");

interface TenantStats {
    leadsUpdated: number;
    contactsUpdated: number;
    contactCollisions: number;
}

async function backfillTenant(tenantId: string, encryptedUrl: string): Promise<TenantStats> {
    const tenantPrisma = getTenantPrisma({ tenantId, encryptedUrl });
    const stats: TenantStats = { leadsUpdated: 0, contactsUpdated: 0, contactCollisions: 0 };

    // --- Leads ---
    const leads = await tenantPrisma.lead.findMany({
        select: { id: true, phone: true, phoneNormalized: true },
    });
    for (const lead of leads) {
        const canonical = canonicalizePhone(lead.phone);
        if (lead.phoneNormalized === canonical) continue;
        if (APPLY) {
            await tenantPrisma.lead.update({ where: { id: lead.id }, data: { phoneNormalized: canonical } });
        }
        stats.leadsUpdated++;
    }

    // --- WhatsAppContacts ---
    const contacts = await tenantPrisma.whatsAppContact.findMany({
        select: { id: true, whatsapp: true, phoneNormalized: true },
    });

    // Detecta colisões: contatos distintos que canonicalizam para o mesmo número.
    const byCanonical = new Map<string, number[]>();
    for (const c of contacts) {
        if (!c.whatsapp) continue; // sem número → nada a normalizar
        const canonical = canonicalizePhone(c.whatsapp);
        const ids = byCanonical.get(canonical) ?? [];
        ids.push(c.id);
        byCanonical.set(canonical, ids);

        if (c.phoneNormalized === canonical) continue;
        if (APPLY) {
            await tenantPrisma.whatsAppContact.update({
                where: { id: c.id },
                data: { phoneNormalized: canonical },
            });
        }
        stats.contactsUpdated++;
    }

    for (const [canonical, ids] of byCanonical) {
        if (ids.length > 1) {
            stats.contactCollisions++;
            console.warn(
                `  ⚠️ colisão de contato no tenant ${tenantId}: ${ids.length} contatos → ${canonical} (ids: ${ids.join(", ")}) — merge manual de histórico necessário`
            );
        }
    }

    return stats;
}

async function main() {
    console.log(`Backfill phoneNormalized — modo: ${APPLY ? "APPLY (escreve)" : "DRY-RUN (não escreve)"}`);

    const tenants = await prisma.crmUser.findMany({
        where: { role: "USER", databaseUrl: { not: null } },
        select: { id: true, name: true, databaseUrl: true },
    });
    console.log(`Tenants a processar: ${tenants.length}`);

    const totals: TenantStats = { leadsUpdated: 0, contactsUpdated: 0, contactCollisions: 0 };

    for (const tenant of tenants) {
        if (!tenant.databaseUrl) continue;
        try {
            const s = await backfillTenant(tenant.id, tenant.databaseUrl);
            totals.leadsUpdated += s.leadsUpdated;
            totals.contactsUpdated += s.contactsUpdated;
            totals.contactCollisions += s.contactCollisions;
            console.log(
                `  ${tenant.name}: leads ${s.leadsUpdated}, contatos ${s.contactsUpdated}, colisões ${s.contactCollisions}`
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : "erro desconhecido";
            console.error(`  ❌ tenant ${tenant.id} falhou: ${msg}`);
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
        // Desconecta o client CRM. Os pools de tenant abertos via getTenantPrisma vivem no
        // cache LRU compartilhado (sem teardown explícito aqui): força a saída para o
        // processo one-off não pendurar com sockets pg vivos. Todas as escritas já
        // concluíram (await) antes deste ponto, então é seguro encerrar.
        await prisma.$disconnect();
        process.exit(process.exitCode ?? 0);
    });
