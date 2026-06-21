# 0005 — Costuras prematuras rejeitadas (não re-sugerir)

> - **Status:** Accepted
> - **Data:** 2026-06-20
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [docs/sprint/README.md](../sprint/README.md), [CONTEXT.md](../../CONTEXT.md)

## Contexto

A varredura de arquitetura de 2026-06-20 (6 exploradores + verificação adversarial por **teste de deleção**) gerou 23 candidatos a aprofundamento. Cinco foram **rejeitados** por serem **costuras prematuras** (1 ou 0 adaptadores) ou por framing incorreto. Sem registro, essas mesmas sugestões reaparecem em toda revisão futura. Este ADR as trava.

**Regra usada:** *uma* implementação de uma costura = costura **hipotética** (não construa). *Duas+* implementações reais que divergem = costura **real** (vale aprofundar). A complexidade que **reaparece** ao deletar o módulo justifica o módulo; a que **some** era pass-through.

## Decisão

Vamos **não** implementar as costuras abaixo. Revisões de arquitetura devem **pular** estas sugestões (ou marcá-las como conflito com este ADR e justificar fortemente por que reabrir).

### R1 — Resolver de "tenant runtime" gordo

Um módulo que recebe um `CrmUser` e retorna `{ tenantPrisma, evolutionClient, aiQuota }` num objeto só.
**Por que rejeitado:** nenhum call site precisa dos três ao mesmo tempo — `getTenantContext` usa `tenantPrisma`+quota e nunca Evolution; `message-history` usa só o cliente Evolution; o worker é batch/sessionless e constrói o cliente Evolution só depois de um check de conectividade. Unificar força **over-fetch** (abrir pool LRU e/ou fazer chamada de rede que o caller não usa). A complexidade real já está corretamente concentrada em `decrypt` (`encryption.ts`), `getTenantPrisma` (`prisma.ts`) e `createEvolutionClient` (`evolution.ts`).
**Também rejeitado:** um wrapper `connectTenant(encryptedUrl)` de 2 linhas combinando `decrypt`+`getTenantPrisma` — é pass-through raso (interface ≈ implementação).
**Alternativa legítima (não-gorda):** tornar a invariante "não abrir pool de ciphertext" inesquecível fazendo `getTenantPrisma` aceitar o valor criptografado (ou `getTenantConnectionString(user)`), e endurecer `decrypt` numa costura estrita — ver [Sprint 03](../sprint/closed/sprint-03-seguranca-credenciais-decrypt.md).

### R2 — Base-URL da Evolution por tenant

Tornar `baseUrl` derivável por tenant em `createEvolutionClient`.
**Por que rejeitado:** não existe coluna de base-URL por tenant no schema; o modelo é **um servidor compartilhado, instância+chave por tenant** (ver [ADR-0004](./0004-shared-evolution-server.md)). Seria uma costura de **zero adaptadores**. Que `baseUrl` seja global enquanto `instance`/`apiKey` são por tenant é **correto** e já está localizado na factory.

### R3 — Transporte HTTP injetável no `EvolutionClient`

Refatorar `getInstanceStatus`/`EvolutionClient` para injetar o transporte (fetch) e "testar a lógica sem mockar HTTP".
**Por que rejeitado:** a costura de domínio **já existe** em `createEvolutionClient` — todo caller real consome o shape normalizado `{ connected, state }` e mocka a factory, não o `fetch`. O único lugar que cruza o seam HTTP é o próprio `evolution.test.ts` (teste unitário do cliente), que é a altitude correta. Injetar transporte é costura de **1 adaptador** (só existe `fetch` real).

### R4 — Costura de provider de LLM no `CampaignPersonalizer`

Extrair uma interface `rewrite(prompt) -> text` para "hospedar um segundo provider depois".
**Por que rejeitado:** OpenAI é o **único** provider — sem segundo adaptador, sem ADR pedindo, sem indício no repo. Costura **hipotética** de 1 adaptador. A classe já é profunda (timeout, parsing de erro, fallbacks, montagem de prompt atrás de `personalize(template, context)`).
**Nota:** o problema **real e aceito** do personalizer é outro — ele esconde o fato "houve chamada faturável?"; a correção é retornar `{ text, usedLLM, reason }`, não criar costura de provider. Ver [Sprint 01](../sprint/closed/sprint-01-quota-ia-e-sinal-de-uso.md).

### R5 — Helper genérico `findContactByPhone` como movimento de DRY

Extrair um helper compartilhado de `whatsAppContact.findFirst({ where: { whatsapp } })` a partir dos call sites atuais.
**Por que rejeitado (na forma DRY):** depois de deletar os readers mortos de `chat.ts` (ver [Sprint 07](../sprint/sprint-07-limpeza-e-honestidade-de-interface.md)), sobram só 2 sites com **semânticas diferentes** (worker = find-or-create + escrita de auditoria; message-history = read-only) sobre um `findFirst` de 2 linhas. Colapsar exige um toggle `create?` — pass-through raso.
**⚠️ Não confunda com o que É aceito:** o **módulo de identidade de telefone** do [Sprint 02](../sprint/sprint-02-identidade-de-telefone.md) — que possui canonicalização + match por forma canônica e corrige um **bug ao vivo** de perda de histórico em 5 sites — é uma costura **real** e **deve** ser construído. A rejeição aqui é apenas contra extrair um `findFirst` cru "porque está duplicado".

## Consequências

- Revisões futuras não gastam esforço re-propondo R1–R5.
- Se o contexto mudar (ex.: surgir um 2º provider de LLM, um 2º servidor Evolution, um 2º transporte), o item correspondente deve ser **reaberto via novo ADR** que supera este, **adicionando o segundo adaptador primeiro**.
- O critério permanece: construa a costura quando o **segundo adaptador real** existir, não antes.
