# Contribuindo — DestraFlow

Antes de tudo, leia **[CLAUDE.md](./CLAUDE.md)** (regras operacionais) e **[docs/HARNESS-ENGINEERING.md](./docs/HARNESS-ENGINEERING.md)** (governança e guardrails). Conceitos de domínio em **[CONTEXT.md](./CONTEXT.md)**.

## Fluxo

1. Branch a partir de `main`: `feat/...`, `fix/...`, `refactor/...`, `docs/...`, `chore/...`.
2. Commits em **[Conventional Commits](https://www.conventionalcommits.org)** — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
3. Abra um PR (o template é aplicado automaticamente). O CI deve passar.

## Definition of Done

- [ ] `npm run lint` limpo
- [ ] `npm run typecheck` verde
- [ ] `npm test` verde — **nenhum teste removido/editado** para passar; testes adicionados/atualizados para a mudança
- [ ] `npm run build` passa
- [ ] Sem segredo/PII no diff; `.env*` não versionado
- [ ] Query de dados de tenant via `src/lib/tenant.ts`; sem webhook de mensageria novo
- [ ] Mudança de arquitetura → ADR (`proposed`) em `docs/adr/`; conceito de domínio novo → termo em `CONTEXT.md`

## Arquitetura

- Decisões vivem em `docs/adr/` (formato MADR). Mudança estrutural inclui o ADR no PR. **Não re-litigue** o que está em [ADR-0005](./docs/adr/0005-rejected-premature-seams.md).
- Fronteiras: **CRM DB** (central) vs **Tenant DB** (por tenant, via resolver) vs **N8N/Evolution** (dono da mensageria; DB é a fonte da verdade).

## Qualidade & segurança

- Testes `*.test.ts` ao lado da fonte (Vitest). Rode o teste do arquivo tocado.
- Nunca versione `.env*`, segredos ou PII (leads/telefones). **Se um segredo vazou: rotacione a chave imediatamente** — apagar o commit não basta.
- Guardrails recomendados (gitleaks, husky/commitlint, coverage, branch ruleset): ver [docs/HARNESS-ENGINEERING.md §5–6](./docs/HARNESS-ENGINEERING.md).
