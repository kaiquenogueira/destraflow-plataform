# Sprint 01 — Quota de IA e sinal de uso da personalização

> **Prioridade:** Crítica
> **Complexidade:** Média
> **Esforço estimado:** 2–3 dias
> **Dependências:** Nenhuma (mas o Ponto 2 deve ser feito ANTES do Ponto 1 dentro deste sprint)
> **Subsistemas:** Worker de mensagens (`src/lib/worker.ts`), Personalização IA (`src/services/ai/campaign-personalizer.ts`), Actions de campanha (`src/actions/campaigns.ts`), Contexto de tenant (`src/lib/tenant.ts`)
> **Status:** Não iniciado

## Resumo executivo

A regra de negócio "N reescritas de IA por tenant/mês, com reset em `aiLimitResetAt`, contando 1 por reescrita" não tem dono: ela está reimplementada de forma **divergente** em três lugares (worker, actions, contexto de tenant). Isso já produz um **bug ao vivo**: um tenant que estoura o limite no caminho automatizado (worker) fica permanentemente bloqueado, porque o worker nunca consulta `aiLimitResetAt` — o reset existe apenas no caminho interativo. Além disso, o módulo `CampaignPersonalizer.personalize()` esconde seu output mais importante ("a IA rodou?") por trás de um retorno `string`, forçando os dois chamadores a inferir o uso via comparação de strings — o que sub-cobra reescritas reais cujo texto coincide com o template. Este sprint cria um módulo profundo dono da quota e faz o personalizer retornar o fato que só ele conhece.

## Pontos abordados

1. **Ponto 2 — `personalize()` esconde seu output mais importante** (severidade média; feito primeiro porque o Ponto 1 consome o sinal `usedLLM`).
2. **Ponto 1 — Módulo de quota de IA sem dono** (severidade alta; **bug ao vivo**).

> Ordem invertida proposital: a quota (Ponto 1) precisa de um sinal confiável de "a IA rodou de fato" para decidir quando incrementar. Esse sinal nasce no Ponto 2.

---

### Ponto 2 — `personalize()` esconde seu output mais importante

**Problema**

`CampaignPersonalizer.personalize()` em `src/services/ai/campaign-personalizer.ts:67` declara retorno `Promise<string>`. Internamente o método tem **pelo menos 4 saídas semanticamente distintas**, todas colapsadas em "retorna uma string":

- `src/services/ai/campaign-personalizer.ts:69-71` — sem API key, retorna `template`.
- `src/services/ai/campaign-personalizer.ts:73-75` — sem contexto relevante (`!aiSummary && notes.length === 0 && !interest`), retorna `template`.
- `src/services/ai/campaign-personalizer.ts:111-117` — erro HTTP (401/`invalid_api_key` ou outro status), retorna `template`.
- `src/services/ai/campaign-personalizer.ts:123-127` — reescrita real (ou fallback se `personalizedMessage` vier vazio em :124).
- `src/services/ai/campaign-personalizer.ts:129-133` — catch (timeout/network), retorna `template`.

Os dois chamadores reconstroem "a IA rodou?" por **desigualdade de string**:

```ts
// src/lib/worker.ts:138-144
const personalizedPayload = await aiPersonalizer.personalize(message.payload, leadContext);

if (personalizedPayload !== message.payload) {
    finalPayload = personalizedPayload;
    aiUsed = true;
    aiMessagesUsed++; // Incrementa localmente para a próxima iteração do loop
}
```

```ts
// src/actions/campaigns.ts:375-379
const personalizedPayload = await getAIPersonalizer().personalize(finalPayload, leadContext);

if (personalizedPayload !== finalPayload) {
    await incrementAIUsage(userId);
}
```

A **interface** do módulo (no sentido do nosso vocabulário: tudo que o chamador precisa saber) esconde o fato mais importante que só `personalize()` conhece — se houve ou não uma chamada ao LLM. O chamador é obrigado a reaprender esse fato com uma heurística frágil (`!==`). Isso é uma **interface rasa**: a alavancagem é baixa porque o chamador precisa de conhecimento extra (a convenção "igual ao template == não usou") que não está na assinatura.

**Causa raiz**

O módulo conhece um fato (rodou o LLM? por quê não?) e o joga fora ao serializar tudo para `string`. O chamador recupera esse fato por canal lateral. A regra "comparar strings para saber se houve cobrança" virou uma **costura implícita** espalhada por dois call sites — em vez de o módulo simplesmente devolver o que sabe.

**Impacto / bug observável**

Sub-cobrança real: quando o LLM roda mas devolve um texto **idêntico** ao template (caso raro, mas possível com templates curtos/diretos ou normalização de espaços), `personalizedPayload === message.payload` é verdadeiro → `aiUsed` fica `false` → a reescrita **não é contada** na quota nem cobrada. É um vazamento silencioso de custo de IA. O sintoma estrutural é pior: qualquer mudança futura no contrato de fallback quebra silenciosamente a contabilidade dos dois chamadores.

**Solução técnica detalhada**

1. Introduzir um tipo de resultado rico e mudar a assinatura de `personalize()` em `src/services/ai/campaign-personalizer.ts`:

   ```ts
   export type PersonalizeReason =
       | "rewritten"        // LLM rodou e devolveu texto novo
       | "no_api_key"       // sem OPENAI_API_KEY
       | "no_context"       // lead sem aiSummary/notes/interest
       | "empty_response"   // LLM respondeu vazio
       | "http_error"       // status != ok (inclui 401/invalid_api_key)
       | "exception";       // timeout / network / abort

   export interface PersonalizeResult {
       /** Texto final a enviar (reescrito OU template, sempre seguro) */
       text: string;
       /** true SE e somente se houve uma chamada bem-sucedida ao LLM que produziu texto */
       usedLLM: boolean;
       reason: PersonalizeReason;
   }

   async personalize(template: string, context: LeadContext): Promise<PersonalizeResult>
   ```

2. Mapear cada saída atual para o resultado correto (mantendo o fallback de texto intacto — o invariante "nunca quebra o fluxo" continua):

   | Local atual | `text` | `usedLLM` | `reason` |
   |---|---|---|---|
   | :69-71 sem key | `template` | `false` | `no_api_key` |
   | :73-75 sem contexto | `template` | `false` | `no_context` |
   | :111-117 erro HTTP | `template` | `false` | `http_error` |
   | :123-125 resposta vazia | `template` | `false` | `empty_response` |
   | :127 reescrita | `personalizedMessage` | `true` | `rewritten` |
   | :129-133 catch | `template` | `false` | `exception` |

   Note que `usedLLM = true` passa a ser definido pelo módulo (houve resposta válida do LLM), **independente** de o texto coincidir com o template — corrigindo a sub-cobrança.

3. Atualizar o call site do worker (ANTES → DEPOIS):

   ```ts
   // ANTES — src/lib/worker.ts:138-144
   const personalizedPayload = await aiPersonalizer.personalize(message.payload, leadContext);
   if (personalizedPayload !== message.payload) {
       finalPayload = personalizedPayload;
       aiUsed = true;
       aiMessagesUsed++;
   }
   ```

   ```ts
   // DEPOIS
   const { text, usedLLM } = await aiPersonalizer.personalize(message.payload, leadContext);
   finalPayload = text;
   aiUsed = usedLLM;
   ```

   (O `aiMessagesUsed++` local some no Ponto 1.)

4. Atualizar o call site da action (ANTES → DEPOIS):

   ```ts
   // ANTES — src/actions/campaigns.ts:375-379
   const personalizedPayload = await getAIPersonalizer().personalize(finalPayload, leadContext);
   if (personalizedPayload !== finalPayload) {
       await incrementAIUsage(userId);
   }
   return { success: true, personalizedMessage: personalizedPayload };
   ```

   ```ts
   // DEPOIS (o increment vira recordPersonalization no Ponto 1)
   const { text, usedLLM } = await getAIPersonalizer().personalize(finalPayload, leadContext);
   if (usedLLM) {
       await recordPersonalization(userId);
   }
   return { success: true, personalizedMessage: text };
   ```

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/services/ai/campaign-personalizer.ts` | editar | Novo tipo `PersonalizeResult` + `PersonalizeReason`; `personalize()` passa a retornar objeto; cada `return template`/`return personalizedMessage` vira `{ text, usedLLM, reason }`. |
| `src/lib/worker.ts` | editar | Desestrutura `{ text, usedLLM }`; remove o sniff `!==`. |
| `src/actions/campaigns.ts` | editar | Desestrutura `{ text, usedLLM }`; troca o sniff por `if (usedLLM)`. |
| `src/services/ai/campaign-personalizer.test.ts` | editar | Asserções passam a ler `result.text` / `result.usedLLM` / `result.reason`. |

**Plano de testes**

`src/services/ai/campaign-personalizer.test.ts` hoje compara só strings (`expect(result).toBe(...)`). Passa a asseverar o resultado rico diretamente:

| Cenário (entrada) | `text` esperado | `usedLLM` | `reason` |
|---|---|---|---|
| `apiKey: ''` | `originalTemplate` | `false` | `no_api_key` |
| lead `{ name, notes: [] }` (sem contexto) | `originalTemplate` | `false` | `no_context` |
| fetcher OK com `content` | `fakeResponse` | `true` | `rewritten` |
| fetcher OK com `content` **== template** | `template` | `true` | `rewritten` (novo caso — prova a correção da sub-cobrança) |
| fetcher OK com `content` vazio | `template` | `false` | `empty_response` |
| fetcher rejeita (timeout) | `originalTemplate` | `false` | `exception` |
| fetcher `{ ok: false, status: 429 }` | `originalTemplate` | `false` | `http_error` |
| fetcher `{ ok: false, status: 401 }` | `originalTemplate` | `false` | `http_error` |

A costura nova ("o módulo devolve o fato") torna desnecessário inferir uso por igualdade — a superfície de teste é o próprio `usedLLM`.

**Riscos & migração**

- Mudança de assinatura quebra qualquer outro chamador de `personalize()`. Há exatamente 2 (worker e action) — ambos atualizados aqui. Não há persistência envolvida; sem migração de dados.
- Ordem de deploy irrelevante isoladamente; este ponto deve ser mergeado junto com o Ponto 1 (mesmo PR ou PRs encadeados), pois o `recordPersonalization` no DEPOIS da action vem do Ponto 1.

**Critérios de aceite**

- [ ] `personalize()` retorna `PersonalizeResult` (`{ text, usedLLM, reason }`).
- [ ] As 4+ saídas internas mapeiam para `reason` distintos conforme a tabela.
- [ ] `usedLLM` é `true` mesmo quando o texto reescrito coincide com o template.
- [ ] Worker e action não comparam mais strings para detectar uso de IA.
- [ ] `campaign-personalizer.test.ts` assevera `usedLLM`/`reason` e cobre o caso "reescrita == template".

---

### Ponto 1 — Módulo de quota de IA sem dono

**Problema**

A regra de quota está fragmentada e **divergente** em três módulos.

1. `src/actions/campaigns.ts` tem as primitivas de DB e o check completo:

   ```ts
   // src/actions/campaigns.ts:30-42
   async function incrementAIUsage(userId: string, quotaPrisma: QuotaPrismaClient = prisma) {
       await quotaPrisma.crmUser.update({
           where: { id: userId },
           data: { aiMessagesUsed: { increment: 1 } },
       });
   }
   async function resetAIUsage(userId: string, quotaPrisma: QuotaPrismaClient = prisma) {
       await quotaPrisma.crmUser.update({
           where: { id: userId },
           data: { aiMessagesUsed: { set: 0 } },
       });
   }
   ```

   ```ts
   // src/actions/campaigns.ts:345-355 — check reset + limite (caminho interativo)
   const { tenantPrisma, userId, aiMessagesUsed = 0, aiMessagesLimit = 15, aiLimitResetAt } = context;
   let currentAIMessagesUsed = aiMessagesUsed;
   if (aiLimitResetAt && new Date() > aiLimitResetAt) {
       await resetAIUsage(userId);
       currentAIMessagesUsed = 0;
   }
   if (currentAIMessagesUsed >= aiMessagesLimit) {
       throw new Error("Limite mensal de IA atingido.");
   }
   ```

2. `src/lib/tenant.ts` vaza as três colunas cruas. O `TenantContext` (`src/lib/tenant.ts:8-15`) expõe `aiMessagesUsed?`, `aiMessagesLimit?`, `aiLimitResetAt?`, e `getTenantContext` as seleciona e repassa cruas:

   ```ts
   // src/lib/tenant.ts:30-37 (select) e :55-57 (retorno)
   select: { id: true, role: true, databaseUrl: true,
       aiMessagesUsed: true, aiMessagesLimit: true, aiLimitResetAt: true },
   // ...
   aiMessagesUsed: user.aiMessagesUsed,
   aiMessagesLimit: user.aiMessagesLimit,
   aiLimitResetAt: user.aiLimitResetAt,
   ```

3. `src/lib/worker.ts` **reimplementa a regra inline e DIFERENTE**:

   ```ts
   // src/lib/worker.ts:128 — gate inline
   if (aiMessagesUsed < aiMessagesLimit) { /* ... */ }
   ```

   ```ts
   // src/lib/worker.ts:143 — contador LOCAL no loop
   aiMessagesUsed++; // Incrementa localmente para a próxima iteração do loop
   ```

   ```ts
   // src/lib/worker.ts:162-166 — update inline (não usa incrementAIUsage)
   if (aiUsed) {
       await prisma.crmUser.update({
           where: { id: crmUserId },
           data: { aiMessagesUsed: { increment: 1 } }
       });
   }
   ```

   E o mais crítico — `processAllTenantMessages` **não seleciona `aiLimitResetAt`** no `findMany` e nunca o passa adiante:

   ```ts
   // src/lib/worker.ts:294-303 — select SEM aiLimitResetAt
   select: {
       id: true, name: true, databaseUrl: true,
       evolutionInstance: true, evolutionApiKey: true, evolutionPhone: true,
       aiMessagesLimit: true, aiMessagesUsed: true,
   },
   ```

   ```ts
   // src/lib/worker.ts:322-323 — passa só used/limit
   user.aiMessagesUsed,
   user.aiMessagesLimit
   ```

**Causa raiz**

Um único conceito ("posso personalizar agora? quando reseto? como registro o uso?") está espalhado por 3 módulos sem dono. Cada cópia divergiu: o caminho interativo aplica reset; o caminho do worker **não conhece o reset** (a coluna nem é selecionada). É o anti-padrão clássico de regra de negócio sem módulo profundo: a lógica vaza para os chamadores e diverge.

**Impacto / bug observável**

- **Bug ao vivo (alta severidade):** um tenant que atinge `aiMessagesUsed >= aiMessagesLimit` fica **permanentemente** sem personalização no caminho automatizado (worker), mesmo depois de `aiLimitResetAt` passar — porque o worker nunca olha `aiLimitResetAt` (gate só em `:128`). O caminho interativo (`generateAIPersonalizedMessage`) reseta corretamente em `:348-351`. Resultado: comportamento inconsistente entre os dois caminhos para o mesmo tenant no mesmo mês.
- **Bug secundário:** `resetAIUsage` (`:37-42`) zera `aiMessagesUsed` mas **nunca avança `aiLimitResetAt`** para o próximo período. Nenhum caminho avança essa data, e **não existe cron de reset** — `src/app/api/cron/process-messages/route.ts:44-47` só chama `processAllTenantMessages` + `updateCampaignStatuses`. Logo, mesmo o caminho interativo, ao resetar uma vez com a data vencida, deixa a data no passado e **reseta a cada chamada** dali em diante (limite efetivamente ilimitado após o primeiro vencimento).

**Solução técnica detalhada**

Criar um módulo profundo dono da quota com **duas entradas atrás de uma costura**. Local recomendado: `src/services/ai/ai-quota.ts` (fica junto ao personalizer, que é o consumidor do domínio de IA).

1. Definir o estado e as funções puras + de efeito:

   ```ts
   // src/services/ai/ai-quota.ts
   import { prisma } from "@/lib/prisma";

   export interface QuotaState {
       used: number;
       limit: number;
       resetAt: Date | null;
   }

   export interface QuotaDecision {
       allowed: boolean;
       reason: "ok" | "limit_reached";
       /** Estado já com reset aplicado (used zerado e resetAt avançado), se houve reset */
       nextState: QuotaState;
       /** true se um novo período começou nesta avaliação */
       didReset: boolean;
   }

   /** Avança a data de reset para o próximo período (mensal). */
   function nextResetAt(from: Date): Date {
       const d = new Date(from);
       d.setMonth(d.getMonth() + 1);
       return d;
   }

   /**
    * Decide se o tenant pode personalizar AGORA.
    * Função pura sobre QuotaState: aplica reset devido (zera used E AVANÇA resetAt)
    * e compara contra limit. Não toca no DB.
    */
   export function canPersonalize(state: QuotaState, now: Date = new Date()): QuotaDecision {
       let { used, limit, resetAt } = state;
       let didReset = false;
       if (resetAt && now > resetAt) {
           used = 0;
           resetAt = nextResetAt(now);
           didReset = true;
       }
       const allowed = used < limit;
       return {
           allowed,
           reason: allowed ? "ok" : "limit_reached",
           nextState: { used, limit, resetAt },
           didReset,
       };
   }

   /** Persiste o consumo de 1 reescrita no DB central (crmUser). */
   export async function recordPersonalization(
       userId: string,
       quotaPrisma: { crmUser: { update: Function } } = prisma
   ): Promise<void> {
       await quotaPrisma.crmUser.update({
           where: { id: userId },
           data: { aiMessagesUsed: { increment: 1 } },
       });
   }

   /** Persiste o reset de período (used=0 e resetAt avançado). */
   export async function applyReset(
       userId: string,
       resetAt: Date,
       quotaPrisma: { crmUser: { update: Function } } = prisma
   ): Promise<void> {
       await quotaPrisma.crmUser.update({
           where: { id: userId },
           data: { aiMessagesUsed: { set: 0 }, aiLimitResetAt: { set: resetAt } },
       });
   }
   ```

   > `applyReset` corrige o bug secundário: avança `aiLimitResetAt` (a versão atual de `resetAIUsage` nunca o fazia).

2. `src/lib/tenant.ts` para de vazar 3 colunas cruas e expõe um objeto de quota:

   ```ts
   // ANTES — src/lib/tenant.ts:12-14
   aiMessagesUsed?: number;
   aiMessagesLimit?: number;
   aiLimitResetAt?: Date | null;
   ```

   ```ts
   // DEPOIS
   import type { QuotaState } from "@/services/ai/ai-quota";
   // ...
   aiQuota?: QuotaState;
   ```

   ```ts
   // DEPOIS — retorno (substitui :55-57)
   aiQuota: {
       used: user.aiMessagesUsed,
       limit: user.aiMessagesLimit,
       resetAt: user.aiLimitResetAt,
   },
   ```

3. `generateAIPersonalizedMessage` em `src/actions/campaigns.ts` consome o módulo (substitui `:345-355` e `:375-379`); remove `incrementAIUsage`/`resetAIUsage` locais (`:30-42`):

   ```ts
   // DEPOIS
   import { canPersonalize, recordPersonalization, applyReset } from "@/services/ai/ai-quota";
   // ...
   const { tenantPrisma, userId, aiQuota } = context;
   const decision = canPersonalize(aiQuota ?? { used: 0, limit: 15, resetAt: null });
   if (decision.didReset && decision.nextState.resetAt) {
       await applyReset(userId, decision.nextState.resetAt);
   }
   if (!decision.allowed) {
       throw new Error("Limite mensal de IA atingido.");
   }
   // ... busca lead, processa template ...
   const { text, usedLLM } = await getAIPersonalizer().personalize(finalPayload, leadContext);
   if (usedLLM) {
       await recordPersonalization(userId);
   }
   return { success: true, personalizedMessage: text };
   ```

4. `src/lib/worker.ts` larga o contador local, o gate inline e o update inline; passa a usar o módulo. Primeiro, **selecionar `aiLimitResetAt`** (`:294-303`) e construir `QuotaState`:

   ```ts
   // DEPOIS — select inclui aiLimitResetAt
   select: { id: true, name: true, databaseUrl: true,
       evolutionInstance: true, evolutionApiKey: true, evolutionPhone: true,
       aiMessagesLimit: true, aiMessagesUsed: true, aiLimitResetAt: true },
   ```

   O `processTenantMessages` recebe um `QuotaState` (em vez de `aiMessagesUsed`/`aiMessagesLimit` soltos) e, por mensagem, decide via `canPersonalize` sobre o estado **corrente** (atualizado a cada reescrita registrada):

   ```ts
   // DEPOIS — dentro do loop de mensagens (substitui :128 e :140-144)
   let quota = quotaState; // recebido por parâmetro, já com QuotaState
   // ...
   const decision = canPersonalize(quota);
   if (decision.didReset && decision.nextState.resetAt) {
       await applyReset(crmUserId, decision.nextState.resetAt);
   }
   quota = decision.nextState;

   let finalPayload = message.payload;
   let aiUsed = false;
   if (decision.allowed) {
       const leadContext = { /* ...igual ao atual... */ };
       const { text, usedLLM } = await aiPersonalizer.personalize(message.payload, leadContext);
       finalPayload = text;
       aiUsed = usedLLM;
   }
   // ... envio ...
   if (aiUsed) {
       await recordPersonalization(crmUserId);
       quota = { ...quota, used: quota.used + 1 };
   }
   ```

   Isso remove `aiMessagesUsed++` (`:143`) e o `prisma.crmUser.update` inline (`:162-166`), unificando no `recordPersonalization`. O worker passa, pela primeira vez, a respeitar `aiLimitResetAt`.

5. **Teste de deleção:** ao apagar `ai-quota.ts`, a regra reaparece (divergente) em `worker.ts` E `campaigns.ts`, exatamente como hoje. São **2 adaptadores reais** consumindo o módulo → costura real, não pass-through. O módulo passa no teste de deleção.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/services/ai/ai-quota.ts` | novo | `QuotaState`, `QuotaDecision`, `canPersonalize` (pura, aplica e avança reset), `recordPersonalization`, `applyReset`. |
| `src/lib/tenant.ts` | editar | `TenantContext` expõe `aiQuota?: QuotaState`; remove as 3 props cruas; mantém o `select` mas mapeia para `aiQuota`. |
| `src/actions/campaigns.ts` | editar | Remove `incrementAIUsage`/`resetAIUsage` locais; `generateAIPersonalizedMessage` usa `canPersonalize`/`applyReset`/`recordPersonalization`. |
| `src/lib/worker.ts` | editar | Seleciona `aiLimitResetAt`; passa `QuotaState`; remove gate inline (:128), contador local (:143) e update inline (:162-166); usa o módulo. |
| `src/lib/worker.test.ts` | editar | Mocks de `crmUser.findMany` incluem `aiLimitResetAt`; assertivas sobre reset no caminho do worker. |
| `src/actions/campaigns.test.ts` | editar | `getTenantContext` mock passa `aiQuota` em vez de `aiMessagesUsed`/`aiMessagesLimit`. |

**Plano de testes**

Testes de unidade puros para `canPersonalize` (entrada→saída), sem DB:

| `state` | `now` vs `resetAt` | `allowed` | `didReset` | `nextState.used` | `nextState.resetAt` |
|---|---|---|---|---|---|
| `{used:5,limit:15,resetAt:futuro}` | antes | `true` | `false` | 5 | inalterado |
| `{used:15,limit:15,resetAt:futuro}` | antes | `false` | `false` | 15 | inalterado |
| `{used:15,limit:15,resetAt:passado}` | depois | `true` | `true` | 0 | +1 mês a partir de `now` |
| `{used:0,limit:15,resetAt:null}` | — | `true` | `false` | 0 | `null` |

Testes de integração leve (com `quotaPrisma` mockado): `recordPersonalization` chama `crmUser.update` com `{ increment: 1 }`; `applyReset` chama com `{ set: 0 }` **e** `aiLimitResetAt: { set: ... }` (prova o avanço de data).

No worker (`src/lib/worker.test.ts`): novo caso — tenant com `aiMessagesUsed = aiMessagesLimit` e `aiLimitResetAt` no passado deve **voltar a personalizar** (regressão do bug ao vivo). Os mocks de `crmUser.findMany` precisam passar a incluir `aiLimitResetAt`.

Na action (`src/actions/campaigns.test.ts`): o teste atual de `generateAIPersonalizedMessage` (`:354-400`) mocka `CampaignPersonalizer.prototype.personalize` para driblar o sniff de string. Com `usedLLM` explícito, o mock devolve `{ text, usedLLM: true, reason: "rewritten" }` e o teste passa a asseverar a costura real (`recordPersonalization` chamado quando `usedLLM` é `true`, e **não** chamado quando `false`). O mock de `getTenantContext` passa a fornecer `aiQuota`.

**Riscos & migração**

- **Sem mudança de schema** — `aiMessagesUsed`, `aiMessagesLimit`, `aiLimitResetAt` já existem em `crmUser`. Apenas a lógica que os manipula muda.
- **Backfill de `aiLimitResetAt`:** tenants existentes podem ter `aiLimitResetAt = null` (nunca reseta) ou data no passado (com o bug atual, ou bloqueados no worker, ou resetando sempre na action). Script de backfill recomendado, idempotente: para todo `crmUser` com `role = USER`, se `aiLimitResetAt IS NULL OR aiLimitResetAt < now()`, setar `aiLimitResetAt = primeiro_dia_do_próximo_mês` e `aiMessagesUsed = 0`. Isso normaliza o estado para a nova lógica de avanço de período. Rodar uma vez no deploy.
- **Ordem de deploy:** Ponto 2 e Ponto 1 devem ir juntos (o DEPOIS da action depende de `recordPersonalization` + `usedLLM`). Backfill **após** o deploy do código (a coluna é compatível com o código antigo, então o reverso também é seguro).
- **Concorrência:** `recordPersonalization` usa `increment` atômico no DB (seguro entre tenants paralelos do worker). O `QuotaState` local no loop é apenas otimização de leitura dentro de um batch; a verdade é sempre relida do DB no próximo cron.

**Critérios de aceite**

- [ ] `src/services/ai/ai-quota.ts` criado com `canPersonalize`, `recordPersonalization`, `applyReset`.
- [ ] `canPersonalize` avança `resetAt` para o próximo período quando há reset (corrige bug secundário).
- [ ] `worker.ts` seleciona `aiLimitResetAt` e respeita o reset (corrige bug ao vivo).
- [ ] Removidos: contador local (`:143`), gate inline (`:128`), update inline (`:162-166`) no worker; `incrementAIUsage`/`resetAIUsage` na action.
- [ ] `TenantContext` expõe `aiQuota` em vez das 3 colunas cruas.
- [ ] Teste de regressão do worker: tenant no limite com `resetAt` vencido volta a personalizar.
- [ ] Script de backfill de `aiLimitResetAt` documentado e executado.

---

## Ordem de execução

1. **Ponto 2** — `personalize()` retorna `PersonalizeResult` (`text`/`usedLLM`/`reason`); atualizar os 2 call sites para ler `usedLLM`; atualizar `campaign-personalizer.test.ts`. Garante o sinal confiável.
2. **Ponto 1** — criar `src/services/ai/ai-quota.ts`; migrar `tenant.ts` para `aiQuota`; migrar `campaigns.ts` e `worker.ts` para o módulo (consumindo `usedLLM` do passo 1); ajustar `worker.test.ts` e `campaigns.test.ts`.
3. Backfill de `aiLimitResetAt` após o deploy do código.
4. (Fora de escopo deste sprint, anotar como follow-up) avaliar um cron dedicado de reset de quota — hoje inexistente; com `applyReset` avançando a data sob demanda, o reset passa a ser correto mesmo sem cron, mas um cron tornaria o estado proativo em vez de lazy.

## Nota de verificação

A verificação adversarial **confirmou** ambos os pontos lendo o código atual: o worker realmente não seleciona `aiLimitResetAt` (`src/lib/worker.ts:294-303`) nem o consulta, enquanto a action reseta (`src/actions/campaigns.ts:348-351`) — o bug ao vivo de bloqueio permanente no caminho automatizado é real e tem severidade alta. O bug secundário também se confirma: `resetAIUsage` (`:37-42`) só faz `set: 0` e nenhum caminho avança a data; não há cron de reset em `route.ts`. O teste de deleção do módulo de quota dá positivo (2 adaptadores reais: worker e action), então o módulo `ai-quota.ts` **não** é costura prematura. Ressalvas para calibrar a confiança: (a) a sub-cobrança do Ponto 2 (reescrita real cujo texto == template) é um caso de borda de baixa frequência — a justificativa principal do Ponto 2 é estrutural (parar de inferir uso por string), não o volume de cobrança perdida; (b) a granularidade mensal em `nextResetAt` (`+1 mês`) é uma recomendação — confirme a política de billing real antes de fixar o período; (c) o `cron de reset` foi deliberadamente deixado **fora** deste sprint para não introduzir costura/infra extra antes de a regra de quota ter um dono — com `applyReset` lazy o reset já fica correto.
