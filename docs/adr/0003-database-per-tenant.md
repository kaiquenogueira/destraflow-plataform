# 0003 — Banco por tenant resolvido em runtime, credenciais criptografadas

> - **Status:** Accepted
> - **Data:** 2026-06-20 (codifica arquitetura existente)
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [CONTEXT.md](../../CONTEXT.md), `src/lib/tenant.ts`, `src/lib/prisma.ts`, `src/lib/encryption.ts`, [Sprint 03](../sprint/sprint-03-seguranca-credenciais-decrypt.md)

## Contexto

A plataforma é multi-tenant com forte isolamento de dados de clientes. É preciso decidir onde ficam os dados de cada tenant e como o app resolve a conexão.

## Decisão

Vamos usar **um banco de dados por tenant** (isolamento físico), além de um **CRM DB central** para identidade/admin:

- O `CrmUser` (CRM DB) guarda a `databaseUrl` do Tenant DB **criptografada em repouso** (AES-GCM, `src/lib/encryption.ts`).
- A conexão do tenant é resolvida em **runtime**: `getTenantContext()` → `decrypt(databaseUrl)` → `getTenantPrisma(url)`.
- `getTenantPrisma` mantém um **cache LRU** de clientes Prisma (cap configurável) para evitar vazamento de pools.
- O schema é único (`prisma/schema.prisma`) e dividido por `npm run db:split` em `schema.crm.prisma` (CRM DB) e `schema.tenant.prisma` (Tenant DB).

## Consequências

- Isolamento forte de dados de cliente; um tenant nunca enxerga o DB de outro.
- Credenciais de conexão **devem** ser tratadas como segredo: nunca logar, sempre `decrypt` antes de abrir pool. A invariante "credencial deve ser ciphertext" precisa ser enforced numa costura estrita — ver [Sprint 03](../sprint/sprint-03-seguranca-credenciais-decrypt.md).
- Custo operacional: provisionar/migrar N bancos; o worker itera todos os tenants configurados.
- A resolução de conexão é **load-bearing** e deve permanecer concentrada em `decrypt` + `getTenantPrisma` (não espalhar `new pg.Pool` pelos call sites). Ver ADR-0005 sobre **não** criar um "resolver de tenant runtime" gordo.
