# 0001 — Usar Architecture Decision Records

> - **Status:** Accepted
> - **Data:** 2026-06-20
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [docs/HARNESS-ENGINEERING.md](../HARNESS-ENGINEERING.md), [CONTEXT.md](../../CONTEXT.md)

## Contexto

O projeto cresce com ajuda de agentes de IA e múltiplos contribuidores. Decisões de arquitetura eram implícitas (espalhadas em comentários e no histórico do git), o que leva a re-litígio: a mesma sugestão de refactor reaparece, e o *porquê* de uma escolha se perde. Não havia `docs/adr/` até agora.

## Decisão

Vamos registrar decisões de arquitetura significativas como ADRs em `docs/adr/`, no formato enxuto descrito em `0000-template.md`. ADRs são imutáveis após `Accepted` — mudanças criam um novo ADR que **supera** o anterior. Revisões de arquitetura devem ler os ADRs antes de propor mudanças.

## Consequências

- O *porquê* das escolhas fica versionado e linkável.
- Decisões **rejeitadas** podem ser registradas para travar contra re-sugestão (ver [ADR-0005](./0005-rejected-premature-seams.md)).
- Custo: cada decisão estrutural exige ~15 min para escrever o ADR; PRs que mudam arquitetura devem incluir/atualizar o ADR correspondente.
