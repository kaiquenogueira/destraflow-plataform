<!-- Título do PR: use Conventional Commits, ex.: feat(campaigns): retry em massa de dead-letter -->

## O que muda

<!-- Descrição curta do "o quê" e do "porquê". Linke a issue/sprint: Closes #NN / Sprint 0N -->

## Tipo

- [ ] feat
- [ ] fix
- [ ] refactor (sem mudança de comportamento)
- [ ] docs
- [ ] chore / infra

## Definition of Done

- [ ] `npm run lint` passa
- [ ] `npx tsc --noEmit` passa (sem erros de tipo)
- [ ] `npm test` passa; **testes novos/atualizados** cobrem a mudança
- [ ] Sem segredos no diff (sem `.env`, chaves, `databaseUrl` em texto plano, tokens)
- [ ] Multi-tenant: respeita a fronteira CRM DB vs Tenant DB ([CONTEXT.md](../CONTEXT.md)); credenciais sempre via `decrypt` antes de abrir pool
- [ ] Não adiciona webhook de mensageria no Next.js ([ADR-0002](../docs/adr/0002-n8n-owns-messaging-webhooks.md))
- [ ] Mudança de arquitetura? ADR criado/atualizado em `docs/adr/`
- [ ] Conceito de domínio novo? Termo adicionado em [CONTEXT.md](../CONTEXT.md)

## Notas de risco / migração

<!-- Migração de dados, ordem de deploy, rollback, impacto em tenants existentes. "Nenhum" se não houver. -->

## Verificação

<!-- Como você verificou: comando rodado, fluxo testado, screenshot. -->
