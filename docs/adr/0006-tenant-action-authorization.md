# 0006 — Autorização de ações de tenant: autenticação + posse de `databaseUrl`

> - **Status:** Accepted
> - **Data:** 2026-06-22
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [Sprint 07](../sprint/sprint-07-limpeza-e-honestidade-de-interface.md), [Sprint 05](../sprint/closed/sprint-05-contrato-tenant-context.md), [ADR-0003](./0003-database-per-tenant.md)

## Contexto

A interface `TenantContext` (`src/lib/tenant.ts`) declarava um campo `userRole: "ADMIN" | "USER"`, populado pelo resolver mas **sem nenhum consumidor** fora de fixtures de teste — nenhuma ação de tenant lia `context.userRole` para decidir acesso. Um campo de interface que anuncia uma garantia de autorização que a camada não cumpre é uma **interface rasa** (promete profundidade inexistente) e um decoy para mantenedores e IA.

Fatos da autorização real no app (reverificados em 2026-06-20):

- `src/proxy.ts` (Next 16 renomeou `middleware`→`proxy`, via `withAuth`) **autentica todas as rotas de feature**, redireciona não-autenticados para `/login`, faz rate-limiting e **gateia `/admin` por papel** (`token?.role !== "ADMIN"` → redirect).
- `requireAdmin` (`src/lib/admin-auth.ts`) gateia as **ações** de `/admin` por papel `ADMIN`.
- O modelo é **um tenant por `databaseUrl`** (ADR-0003): o `USER` é o dono do próprio Tenant DB.

Ou seja: a distinção `USER`/`ADMIN` **dentro** de um tenant não é hoje um requisito — não há papéis intra-tenant. Que um `USER` autenticado e dono de `databaseUrl` alcance as ações do **próprio** tenant é **por design**. Não há vulnerabilidade; há um campo morto.

## Decisão

Vamos definir que **autorização para ações de tenant = principal autenticado + posse de `databaseUrl` configurada**, resolvida por `getTenantContext` (`src/lib/tenant.ts`). A distinção de papel `USER`/`ADMIN` **não participa** das ações de tenant.

Concretamente:

1. **Remover `userRole` de `TenantContext`** (interface e retorno do resolver). O contexto não carrega papel.
2. **Autorização por papel permanece em duas camadas existentes**, não no contexto de tenant: na borda (`src/proxy.ts`, gate de `/admin`) e nas ações admin (`requireAdmin`).
3. **Identidade do principal** (sessão → `CrmUser` validado, com o vocabulário de erro "Não autorizado" / "Usuário não encontrado") passa a ter dono único em `src/lib/principal.ts` (`validatePrincipal`), consumido por `requireAdmin` e `getOptionalTenantContext`.

## Consequências

- A interface de `TenantContext` deixa de prometer um gate de papel que não existia — fica honesta sobre o que entrega (`tenantPrisma`, `userId`, `aiQuota`).
- O vocabulário de erro de identidade fica centralizado em `validatePrincipal`; gates divergiam em strings antes.
- **Proibido** reintroduzir lógica de papel "fantasma" no contexto de tenant sem consumidor real.
- **Se** papéis intra-tenant virarem requisito no futuro, a reintrodução deve ser **load-bearing**: um gate explícito e testável. O caminho natural é estender o `requireTenantContext` **já existente** (Sprint 05, hoje sem parâmetro) com um `minRole`, num **único** ponto — não recriar uma segunda assinatura. Essa mudança exige novo ADR superando este.

## Alternativas consideradas

- **Tornar `userRole` load-bearing agora** (gate `requireTenantContext(minRole)`) — descartada: não há requisito nem consumidor de papel intra-tenant hoje; seria costura especulativa. Reaberta apenas quando o segundo papel real existir.
