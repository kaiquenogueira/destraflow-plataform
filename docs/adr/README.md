# Architecture Decision Records (ADR)

Registros leves de decisões de arquitetura do DestraFlow. Um ADR captura **uma decisão**, seu **contexto** e suas **consequências** — para que decisões não sejam re-litigadas e para que novos contribuidores (humanos ou agentes de IA) entendam o *porquê*.

Formato: variação enxuta do [MADR](https://adr.github.io/madr/). Ver [`0000-template.md`](./0000-template.md).

## Quando criar um ADR

- Uma decisão estrutural com trade-offs (escolha de arquitetura, fronteira, dependência pesada).
- Uma decisão de **rejeitar** um refactor/abordagem — para travar contra re-sugestão (ex.: [ADR-0005](./0005-rejected-premature-seams.md)).
- Reverter/superar uma decisão anterior (status `Superseded by NNNN`).

## Status possíveis

`Proposed` · `Accepted` · `Rejected` · `Superseded by NNNN` · `Deprecated`

## Índice

| # | Título | Status |
|---|--------|--------|
| [0000](./0000-template.md) | Template | — |
| [0001](./0001-record-architecture-decisions.md) | Usar Architecture Decision Records | Accepted |
| [0002](./0002-n8n-owns-messaging-webhooks.md) | N8N é dono dos webhooks de mensageria; app não escuta eventos | Accepted |
| [0003](./0003-database-per-tenant.md) | Banco por tenant resolvido em runtime, credenciais criptografadas | Accepted |
| [0004](./0004-shared-evolution-server.md) | Servidor Evolution compartilhado, instância+chave por tenant | Accepted |
| [0005](./0005-rejected-premature-seams.md) | Costuras prematuras rejeitadas (não re-sugerir) | Accepted |
| [0006](./0006-tenant-action-authorization.md) | Autorização de ações de tenant: auth + posse de `databaseUrl` (`userRole` removido) | Accepted |
| [0007](./0007-codec-de-credenciais-de-tenant.md) | Codec de credenciais de tenant (encode/decode com dono único) | Proposed |
| [0008](./0008-postura-seguranca-dependencias.md) | Postura de segurança de dependências (xlsx via CDN, overrides, deferrals) | Accepted |

> Revisões de arquitetura (ex.: skill `improve-codebase-architecture`) devem **ler os ADRs antes** de propor mudanças e **marcar conflitos** explicitamente em vez de re-sugerir o que já foi decidido.
