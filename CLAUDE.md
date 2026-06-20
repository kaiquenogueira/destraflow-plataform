# CLAUDE.md — DestraFlow

Guia operacional para agentes de IA. **Mantenha < 200 linhas.** Detalhes vivem nos docs linkados — carregue sob demanda, não duplique aqui.

## Stack
Next.js 16 (App Router) · React 19 · Prisma 7 (multi-DB) · NextAuth · Upstash Redis · Vitest · Shadcn/UI. Integrações: **Evolution API** (WhatsApp) e **N8N** (dono dos eventos de mensagem; **o DB é a fonte da verdade**).

## Comandos
- `npm run dev` — dev server (webpack)
- `npm run lint` · `npm run typecheck` (`tsc --noEmit`)
- `npm test` — testes uma vez (vitest run, usado no CI) · `npm run test:watch` (local) · `npm run test:coverage`
- `npm run build`
- **DB:** `npm run db:split` gera `schema.crm.prisma` + `schema.tenant.prisma` a partir de `schema.prisma` e roda **antes** de `db:generate`. Também: `db:generate`, `db:push:crm`, `db:migrate`. (`postinstall` já faz split + generate.)

## Mapa (ver @PROJECT_STRUCTURE.md)
- `src/actions/` — Server Actions **finas**: Zod + auth + delega para `lib`/`services`.
- `src/lib/` — lógica profunda server-side: `tenant.ts` (resolver de tenant — fronteira crítica), `worker.ts` (fila/retry/DLQ/envio), `encryption.ts`, `prisma.ts`, `evolution.ts`, `redis.ts`, `auth.ts`.
- `src/services/` — domínios complexos (ex.: `ai/`).
- `src/components/` — UI (Shadcn). `src/app/` — rotas finas que delegam.

## Regras inegociáveis
1. **Multi-tenant:** dados de tenant SEMPRE via `src/lib/tenant.ts` (`getTenantContext`), com id derivado da sessão NextAuth. **Nunca** importe o client global `@/lib/prisma` em código de feature; **nunca** confie em id vindo do client. (ADR-0003)
2. **Credenciais:** sempre `decrypt(...)` antes de abrir pool de DB/Evolution; **nunca** logue segredo decriptado. CRM DB (central) ≠ Tenant DB (por tenant). (ADR-0003)
3. **N8N é dono dos eventos de mensagem:** **NÃO** crie `/api/webhook/*` de mensageria; o DB é a fonte da verdade. (ADR-0002)
4. **Evolution:** servidor **compartilhado**, instância+chave por tenant; **sem** base-URL por tenant. (ADR-0004)
5. **Testes:** **nunca** edite/remova um teste para a suíte passar. Rode o teste do arquivo tocado + `typecheck` antes de concluir.
6. **Segredos/PII:** nunca em fixtures, logs ou arquivos versionados. `.env*` nunca versionado.

## Antes de mudar arquitetura
Leia `docs/adr/` + `CONTEXT.md`. **NÃO re-proponha** o que está em **[ADR-0005](./docs/adr/0005-rejected-premature-seams.md)** (costuras prematuras rejeitadas): resolver de tenant "gordo", base-URL Evolution por tenant, transporte HTTP injetável, costura de provider LLM, helper `findContactByPhone` cru. Mudança estrutural → ADR `proposed` no mesmo PR.

## Trabalho planejado
Plano em `docs/sprint/` (01–07, por prioridade). Bugs ao vivo no topo: **S01** quota de IA (worker nunca reseta), **S02** identidade de telefone (histórico some), **S03** decrypt (credencial em texto plano abre pool).

## Convenções
- kebab-case nos arquivos; `*.test.ts` **ao lado** da fonte.
- Action/componente = interface fina; lógica profunda em `lib/`.
- Evite barrels (`index.ts` re-export) em código de app — trava tree-shaking.
- **Conventional Commits.** Profundidade de módulo: vocabulário em @docs/HARNESS-ENGINEERING.md.

## Definition of Done
`lint` + `typecheck` + `test` (sem apagar teste) + `build` verdes · sem segredo/PII no diff · query de tenant via resolver · ADR/CONTEXT atualizados se necessário. Completo em @docs/HARNESS-ENGINEERING.md §7.

## Ponteiros
@CONTEXT.md (domínio) · @PROJECT_STRUCTURE.md · @docs/ARCHITECTURE.md · @docs/HARNESS-ENGINEERING.md (governança/guardrails) · @docs/adr/README.md · @docs/sprint/README.md

<!-- Manutenção: "explicou 2x → vira regra aqui". Preferências pessoais em CLAUDE.local.md (gitignored). Sem segredos: este arquivo é versionado. -->
