# Sprint 04 — Ciclo de vida de CampaignMessage e envelope de ChatHistory

> - **Prioridade:** Média
> - **Complexidade:** Média
> - **Esforço estimado:** 3–4 dias
> - **Dependências:** Nenhuma (relacionado ao Sprint 02 — ambos tocam persistência de mensagem; coordenar a ordem de merge se houver overlap em `worker.ts`)
> - **Subsistemas:** Worker de mensagens, Ações de campanha, Histórico de chat (ChatHistory)
> - **Status:** ✅ Concluído (2026-06-22). Código mergeado (PR #20). Sem migração (mudança de código). Gate verde: lint 0-err · typecheck · 190 testes · build.

## Resumo executivo

A máquina de estados de `CampaignMessage` (`PENDING`/`FAILED` → `PROCESSING` → `SENT` | `FAILED` | `DEAD_LETTER`) existe apenas como statements imperativos colados a I/O dentro de `processTenantMessages` em `src/lib/worker.ts`. O conceito de "mensagem ainda não terminada" está reimplementado em pelo menos três lugares com definições **que já discordam entre si** — o que produz um drift latente de conclusão de campanha (campanha pode marcar `COMPLETED` cedo demais quando só restam `DEAD_LETTER`). Em paralelo, o envelope `message` gravado em `ChatHistory` (`{ type, content }`) é um contrato não documentado entre o writer (worker) e os readers (`message-history.ts`, `chat.ts`), sem dono e sem teste que cruze a costura: renomear a tag `"system"` no writer transforma silenciosamente todas as mensagens em `"incoming"`. Este sprint extrai os predicados de ciclo de vida para uma costura multi-chamador, torna a decisão `FAILED`-vs-`DEAD_LETTER` uma função pura unit-testável, e introduz um codec pequeno que centraliza encode/decode do envelope de `ChatHistory`.

## Pontos abordados

1. Máquina de estados de `CampaignMessage` inlined no worker; "terminalidade" duplicada e divergente.
2. Envelope `message` do `ChatHistory` é contrato não documentado entre writer e reader.

---

### Ponto 1 — Máquina de estados de CampaignMessage inlined no worker; "terminalidade" duplicada e divergente

**Problema**

O ciclo de vida inteiro de `CampaignMessage` vive como statements imperativos dentro de `processTenantMessages` em `src/lib/worker.ts`. Não há módulo: o predicado de elegibilidade, as transições de estado e a regra de cap de retries estão todos espalhados e colados a chamadas Prisma/Evolution.

Predicado de elegibilidade — `src/lib/worker.ts:68-98`:

```ts
const pendingMessages = await tenantPrisma.campaignMessage.findMany({
    where: {
        OR: [
            { status: "PENDING", scheduledAt: { lte: new Date() } },
            { status: "FAILED", retryCount: { lt: MAX_RETRIES }, scheduledAt: { lte: new Date() } },
        ],
    },
    // ...
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: MESSAGES_PER_BATCH,
});
```

Transição para `PROCESSING` — `src/lib/worker.ts:118-121`. Transição para `SENT` — `src/lib/worker.ts:151-159`. Decisão `DEAD_LETTER`-vs-`FAILED` por `newRetryCount >= MAX_RETRIES` — `src/lib/worker.ts:185-205`:

```ts
const newRetryCount = (message.retryCount ?? 0) + 1;

if (newRetryCount >= MAX_RETRIES) {
    await tenantPrisma.campaignMessage.update({
        where: { id: message.id },
        data: {
            status: "DEAD_LETTER",
            error: `Falha permanente após ${MAX_RETRIES} tentativas: ${errorMessage}`,
            retryCount: newRetryCount,
        },
    });
    result.deadLettered++;
} else {
    await tenantPrisma.campaignMessage.update({
        where: { id: message.id },
        data: { status: "FAILED", error: errorMessage, retryCount: newRetryCount },
    });
    result.failed++;
}
```

O conceito de "mensagem **não terminada**" (ainda precisa ser trabalhada) está reexpresso em `updateCampaignStatuses` — `src/lib/worker.ts:374-377` — tratando **qualquer** `FAILED` como não-feito e **ignorando** `DEAD_LETTER`:

```ts
messages: {
    where: { status: { in: ["PENDING", "FAILED"] } },
    select: { id: true },
},
```

E novamente nas ações de campanha: `cancelCampaign` faz `PENDING` → `FAILED` (`src/actions/campaigns.ts:292-295`); `retryCampaignDeadLetters` (`src/actions/campaigns.ts:412-419`) e `retryDeadLetterMessage` (`src/actions/campaigns.ts:458-466`) fazem `DEAD_LETTER` → `PENDING` com `retryCount: 0`.

**Por que isso é um módulo raso/ausente.** Não existe nem interface. O conhecimento "o que conta como elegível", "o que conta como terminal" e "qual é o cap de retries" é replicado em cada call site com SQL/`where` manual. A única superfície de teste é `processAllTenantMessages`, exercida em `src/lib/worker.test.ts` com `prisma`, `getTenantPrisma`, `createEvolutionClient`, `decrypt` e `setTimeout` **todos mockados** (`src/lib/worker.test.ts:9-59`), assertando em payloads de `update()` (`src/lib/worker.test.ts:100-105`, `186-195`, `224-232`). Isso é testar **passando da interface**: para verificar a regra `FAILED`-vs-`DEAD_LETTER`, o teste precisa atravessar o worker inteiro e inspecionar o argumento de um `update()` mockado. A regra de decisão não tem superfície própria.

**Causa raiz**

Um único conceito — a máquina de estados de `CampaignMessage` — está fatiado em (a) um `where` de query no worker, (b) um `if/else` imperativo no worker, (c) um `where` de query em `updateCampaignStatuses`, e (d) três `updateMany`/`update` nas ações. Cada cópia codifica sua própria opinião sobre "elegível" e "terminal". Como nenhuma é o dono, elas **divergiram**:

- A query do worker considera retryável só `FAILED` com `retryCount < MAX_RETRIES`.
- `updateCampaignStatuses` considera não-feito **qualquer** `FAILED` (incluindo `FAILED` no cap, que o worker nunca mais pega) e **não** considera `DEAD_LETTER`.

**Impacto / bug observável**

Drift latente de conclusão de campanha:

1. **Completa cedo demais.** Uma campanha cujas mensagens restantes estão todas em `DEAD_LETTER` será marcada `COMPLETED` por `updateCampaignStatuses` (porque `DEAD_LETTER` não está em `["PENDING","FAILED"]` e `hasPendingOrFailed` fica falso — `src/lib/worker.ts:382-388`). O usuário vê a campanha como "Concluída" mesmo com mensagens que nunca foram entregues. É exatamente esse drift que `retryCampaignDeadLetters` tenta remediar manualmente voltando a campanha para `PROCESSING` (`src/actions/campaigns.ts:422-429`).
2. **Nunca completa.** Uma mensagem que atinge `FAILED` com `retryCount == MAX_RETRIES` (estado alcançável se o cap for ajustado, ou via dados legados) entra em `["PENDING","FAILED"]` de `updateCampaignStatuses` mas **não** é elegível na query do worker. Resultado: campanha presa em `PROCESSING` para sempre, sem ninguém para processar a mensagem.

Hoje o bug #1 é evitado por sorte porque o worker move falhas terminais para `DEAD_LETTER` antes de baterem o cap como `FAILED`. Mas as definições já discordam — qualquer mudança em `MAX_RETRIES`, ou qualquer dado escrito por outro caminho, reabre o buraco.

**Solução técnica detalhada**

Dois movimentos **separáveis**. O primeiro é o que justifica o sprint pelo teste de deleção; o segundo é deepening de testabilidade.

**Movimento (a) — Costura multi-chamador: predicados de ciclo de vida (passa no teste de deleção).**

Criar `src/lib/campaign-message-lifecycle.ts` como dono único de elegibilidade, terminalidade e do cap de retries.

```ts
// src/lib/campaign-message-lifecycle.ts
import type { Prisma } from "@prisma/client"; // ajustar ao client gerado

export const MAX_RETRIES = 3;

export type CampaignMessageStatus =
    | "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "DEAD_LETTER";

/** Status que ainda exigem trabalho do worker para a campanha ser concluída. */
export const UNFINISHED_STATUSES: CampaignMessageStatus[] = [
    "PENDING", "PROCESSING", "FAILED", "DEAD_LETTER",
];

/** `where` de elegibilidade para o worker buscar (precisa de `scheduledAt <= now`). */
export function eligibleForSendWhere(now: Date = new Date()): Prisma.CampaignMessageWhereInput {
    return {
        OR: [
            { status: "PENDING", scheduledAt: { lte: now } },
            { status: "FAILED", retryCount: { lt: MAX_RETRIES }, scheduledAt: { lte: now } },
        ],
    };
}

/** `where` de "campanha ainda não concluída". Decide o cálculo de COMPLETED. */
export function unfinishedMessagesWhere(): Prisma.CampaignMessageWhereInput {
    return { status: { in: UNFINISHED_STATUSES } };
}
```

Decisão de design sobre `DEAD_LETTER`: incluí-lo em `UNFINISHED_STATUSES` faz com que campanha **não** complete enquanto houver dead letters — coerente com o fato de `retryCampaignDeadLetters` existir e reabrir a campanha. Isso corrige o bug #1 (não completa mais cedo demais). Caso o produto prefira que `DEAD_LETTER` seja terminal-para-conclusão (campanha completa, dead letters ficam visíveis para retry manual), basta removê-lo da lista — a escolha passa a ser **uma linha, em um lugar**, em vez de implícita em quatro `where` divergentes. Documentar a decisão escolhida no topo do arquivo.

Call sites — ANTES → DEPOIS:

- Worker, query de elegibilidade (`src/lib/worker.ts:68-98`):

```ts
// DEPOIS
const pendingMessages = await tenantPrisma.campaignMessage.findMany({
    where: eligibleForSendWhere(),
    include: { lead: { select: { /* ...igual... */ } } },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: MESSAGES_PER_BATCH,
});
```

- `updateCampaignStatuses` (`src/lib/worker.ts:374-377`):

```ts
// DEPOIS
messages: { where: unfinishedMessagesWhere(), select: { id: true } },
```

- Worker passa a importar `MAX_RETRIES` do novo módulo e remove a constante local de `src/lib/worker.ts:16`.

As ações `cancelCampaign`/`retryCampaignDeadLetters`/`retryDeadLetterMessage` continuam escrevendo transições manualmente, mas devem importar `MAX_RETRIES` e os literais de status do novo módulo, garantindo que "voltar para `PENDING` com `retryCount: 0`" e "o cap" referenciem a mesma fonte.

**Movimento (b) — Deepening de testabilidade: decisão pura `applyOutcome` (1 chamador, justificado pelo formato-de-teste-errado).**

Extrair a decisão `FAILED`-vs-`DEAD_LETTER` (e o cálculo de `SENT`) como função pura no mesmo módulo, sem I/O:

```ts
// src/lib/campaign-message-lifecycle.ts (continuação)

export type SendOutcome =
    | { kind: "sent" }
    | { kind: "error"; message: string };

export interface MessageUpdate {
    status: Extract<CampaignMessageStatus, "SENT" | "FAILED" | "DEAD_LETTER">;
    retryCount: number;
    error: string | null;
    sentAt: Date | null;
}

/** Decisão pura: dado o retryCount atual e o resultado do envio, qual update aplicar. */
export function applyOutcome(
    currentRetryCount: number,
    outcome: SendOutcome,
    now: Date = new Date(),
): MessageUpdate {
    if (outcome.kind === "sent") {
        return { status: "SENT", retryCount: currentRetryCount, error: null, sentAt: now };
    }
    const newRetryCount = (currentRetryCount ?? 0) + 1;
    if (newRetryCount >= MAX_RETRIES) {
        return {
            status: "DEAD_LETTER",
            retryCount: newRetryCount,
            error: `Falha permanente após ${MAX_RETRIES} tentativas: ${outcome.message}`,
            sentAt: null,
        };
    }
    return { status: "FAILED", retryCount: newRetryCount, error: outcome.message, sentAt: null };
}
```

No worker, o bloco `try/catch` de `src/lib/worker.ts:181-210` passa a delegar a decisão e só aplica I/O:

```ts
// DEPOIS (esboço do catch)
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const upd = applyOutcome(message.retryCount ?? 0, { kind: "error", message: errorMessage });
    await tenantPrisma.campaignMessage.update({
        where: { id: message.id },
        data: { status: upd.status, error: upd.error, retryCount: upd.retryCount },
    });
    if (upd.status === "DEAD_LETTER") result.deadLettered++; else result.failed++;
    result.errors.push(`Message ${message.id} (retry ${upd.retryCount}/${MAX_RETRIES}): ${errorMessage}`);
}
```

Adicionalmente, mover `calculateDelay` (`src/lib/worker.ts:36-44`) para este módulo e exportá-la. Hoje ela só roda com `setTimeout` stubado em `src/lib/worker.test.ts:55-58`; isolada, ganha superfície de teste própria (limites, cap de 30s, monotonicidade aproximada do backoff por `retryCount`).

Onde mora: `src/lib/campaign-message-lifecycle.ts` (novo). Não criar diretório novo — fica ao lado de `worker.ts`.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/campaign-message-lifecycle.ts` | novo | Dono de `MAX_RETRIES`, `UNFINISHED_STATUSES`, `eligibleForSendWhere`, `unfinishedMessagesWhere`, `applyOutcome`, `calculateDelay` |
| `src/lib/worker.ts` | editar | Importa do novo módulo; remove `MAX_RETRIES` e `calculateDelay` locais; query usa `eligibleForSendWhere`; `updateCampaignStatuses` usa `unfinishedMessagesWhere`; catch usa `applyOutcome` |
| `src/actions/campaigns.ts` | editar | Importa `MAX_RETRIES` e literais de status do novo módulo (sem mudar comportamento das transições) |
| `src/lib/campaign-message-lifecycle.test.ts` | novo | Testa `applyOutcome` e `calculateDelay` como funções puras, sem mocks |
| `src/lib/worker.test.ts` | editar | Mantém testes de integração existentes (devem continuar passando); pode remover asserts redundantes de payload agora cobertos por unit |

**Plano de testes**

Unit puro de `applyOutcome` (entrada → saída), sem `prisma`/`evolution`/`setTimeout`:

| `currentRetryCount` | `outcome` | `status` esperado | `retryCount` | `sentAt` |
|---|---|---|---|---|
| 0 | `{ kind: "sent" }` | `SENT` | 0 | `now` |
| 5 | `{ kind: "sent" }` | `SENT` | 5 | `now` |
| 0 | `{ kind: "error", message: "x" }` | `FAILED` | 1 | `null` |
| 1 | `{ kind: "error", message: "x" }` | `FAILED` | 2 | `null` |
| 2 | `{ kind: "error", message: "x" }` | `DEAD_LETTER` | 3 | `null` |
| 3 | `{ kind: "error", message: "x" }` | `DEAD_LETTER` | 4 | `null` |

Unit de `calculateDelay`: para `retryCount` 0..3, resultado em `[~1600, 30000]` (respeita jitter ±20% sobre o piso de 2000 e cap de 30000); valor sempre `<= 30000`. Usar `vi.spyOn(Math, "random")` para fixar limites superior/inferior.

Unit de elegibilidade/terminalidade: `eligibleForSendWhere` e `unfinishedMessagesWhere` retornam o `where` esperado (snapshot do objeto), garantindo que `DEAD_LETTER` está/não-está conforme a decisão documentada.

Os testes de `src/lib/worker.test.ts` que hoje assertam `status: "SENT"`/`"FAILED"`/`"DEAD_LETTER"` (`:100-105`, `:186-195`, `:224-232`) continuam válidos como integração, mas a **regra** deixa de depender deles: o caso "dead-letter após MAX_RETRIES" (`src/lib/worker.test.ts:199-234`) passa a ser corroborado por um unit que não precisa montar `crmUser`, `evolutionClient`, `findMany` e `setTimeout`. A costura nova torna a regra verificável **sem atravessar a interface**.

**Riscos & migração**

- Sem migração de schema. Mudança é de código.
- **Mudança de comportamento observável:** se `DEAD_LETTER` entrar em `UNFINISHED_STATUSES`, campanhas que hoje marcam `COMPLETED` com dead letters restantes deixarão de completar até o retry/limpeza. Isso é a correção do bug, mas é visível no painel — comunicar. Se indesejado para dados em produção, manter `DEAD_LETTER` fora e tratar só o bug #2 (nunca completa) nesta passada.
- Sem backfill obrigatório. Opcional: varrer mensagens `FAILED` com `retryCount >= MAX_RETRIES` (estado órfão) e migrá-las para `DEAD_LETTER`, eliminando o caminho "nunca completa".
- Ordem de deploy: independente; deploy único.

**Critérios de aceite**

- [x] `src/lib/campaign-message-lifecycle.ts` existe e é dono de `MAX_RETRIES`, predicados de elegibilidade/terminalidade, `applyOutcome` e `calculateDelay`.
- [x] `worker.ts` não declara mais `MAX_RETRIES` nem `calculateDelay` localmente; usa os helpers do módulo.
- [x] `updateCampaignStatuses` e a query do worker referenciam a mesma definição de "não-terminado"/"elegível".
- [x] `applyOutcome` tem cobertura unit completa sem mockar `prisma`/`evolution`/`setTimeout`.
- [x] `calculateDelay` tem teste unit próprio.
- [x] Decisão sobre `DEAD_LETTER` em `UNFINISHED_STATUSES` está documentada no topo do módulo.
- [x] `src/lib/worker.test.ts` continua verde.

---

### Ponto 2 — Envelope `message` do ChatHistory é contrato não documentado entre writer e reader

**Problema**

O worker grava o envelope da mensagem de auditoria outbound em `persistOutboundMessageAudit` — `src/lib/worker.ts:245-256`:

```ts
await tenantPrisma.chatHistory.create({
    data: {
        userId: contact.id,
        sessionId,
        threadId,
        message: { type: "system", content: message.payload },
        createdAt: new Date(),
    },
});
```

O reader decide a **direção** da mensagem inspecionando a tag `type` — `src/actions/message-history.ts:88-89`:

```ts
const messageData = msg.message as { type?: string; content?: string } | null;
const isOutgoing = messageData?.type === "system" || messageData?.type === "outgoing";
```

E, quando `content` está ausente, cai em `JSON.stringify(msg.message)` — `src/actions/message-history.ts:94`:

```ts
text: messageData?.content || JSON.stringify(msg.message) || "",
```

`chat.ts` também devolve a forma crua de `message` sem decodificá-la (`src/actions/chat.ts:74-80` e `:93-117`), deixando o consumidor de UI lidar com o shape.

**Por que é uma costura sem dono.** O mapeamento `type → direction` é um contrato cross-módulo (writer no worker, reader em `message-history.ts`) — e, segundo `docs/ARCHITECTURE.md`, **N8N também escreve nessa tabela**, então é cross-processo. Mas o discriminador `"system"` aparece como string literal em ambos os lados sem fonte compartilhada. O teste do reader hardcoda `type: "system"` independentemente do writer (`src/actions/message-history.test.ts:65`), então renomear a tag no writer **não quebra nenhum teste** — passa a costura.

**Causa raiz**

O fato mais importante do envelope (qual `type` significa "outbound") está duplicado como literal em writer e reader, sem dono. A interface do `ChatHistory.message` é "um JSON qualquer" — o conhecimento real (discriminador de direção, campo de texto, fallback) vive na cabeça de quem leu os dois arquivos. Não há localidade.

**Impacto / bug observável**

- **Latente, silencioso:** renomear a tag `"system"` no writer (`src/lib/worker.ts:251`) reclassifica todas as mensagens outbound como `"incoming"` no chat, sem nenhum teste falhando. Sintoma para o usuário: balões da própria empresa aparecem do lado do lead.
- **Ao vivo, cosmético:** quando `content` está ausente (envelope de outra origem com shape diferente), o reader vaza `JSON.stringify(msg.message)` cru para dentro do balão do chat (`src/actions/message-history.ts:94`). O usuário vê `{"type":"...","content":...}` literal na conversa.

**Solução técnica detalhada**

Criar um codec pequeno em `src/lib/chat-envelope.ts`, dono do encode (writer) e do decode (reader), fixando o discriminador como constante única.

```ts
// src/lib/chat-envelope.ts

/** Discriminador único de auditoria outbound gravada pelo worker. */
export const OUTBOUND_AUDIT_TYPE = "system" as const;

/** Tipos reconhecidos como saída (empresa → lead). */
const OUTGOING_TYPES = new Set([OUTBOUND_AUDIT_TYPE, "outgoing"]);

export interface ChatEnvelope {
    type?: string;
    content?: string;
}

export interface DecodedMessage {
    direction: "incoming" | "outgoing";
    text: string;
}

/** Encode da linha de auditoria outbound (writer). */
export function encodeOutboundAudit(content: string): ChatEnvelope {
    return { type: OUTBOUND_AUDIT_TYPE, content };
}

/** Decode de uma linha de ChatHistory.message para {direction, text} (reader). */
export function decodeChatEnvelope(raw: unknown): DecodedMessage {
    const env = (raw ?? {}) as ChatEnvelope;
    const direction = env.type && OUTGOING_TYPES.has(env.type) ? "outgoing" : "incoming";
    // Fallback explícito — nunca vaza JSON cru para a UI.
    const text = typeof env.content === "string" && env.content.length > 0 ? env.content : "";
    return { direction, text };
}
```

Call sites — ANTES → DEPOIS:

- Writer (`src/lib/worker.ts:250-253`):

```ts
// DEPOIS
message: encodeOutboundAudit(message.payload),
```

- Reader (`src/actions/message-history.ts:87-98`):

```ts
// DEPOIS
return chatMessages.map((msg) => {
    const { direction, text } = decodeChatEnvelope(msg.message);
    return {
        id: String(msg.id),
        direction,
        text,
        timestamp: msg.createdAt || new Date(),
        source: "database" as const,
    };
});
```

Isso remove o `JSON.stringify(msg.message)` cru (`src/actions/message-history.ts:94`): o fallback passa a ser string vazia controlada, não JSON vazado.

Onde mora: `src/lib/chat-envelope.ts` (novo).

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/chat-envelope.ts` | novo | `OUTBOUND_AUDIT_TYPE`, `encodeOutboundAudit`, `decodeChatEnvelope` |
| `src/lib/worker.ts` | editar | `persistOutboundMessageAudit` usa `encodeOutboundAudit` em vez de literal `{ type: "system", content }` |
| `src/actions/message-history.ts` | editar | `getMessagesFromDatabase` usa `decodeChatEnvelope`; remove o fallback de `JSON.stringify` |
| `src/lib/chat-envelope.test.ts` | novo | Testa encode/decode e o round-trip writer→reader |
| `src/actions/message-history.test.ts` | editar | Atualiza expectativas se necessário (comportamento mantido) |

**Plano de testes**

Unit de `decodeChatEnvelope` (entrada → saída):

| `raw` | `direction` | `text` |
|---|---|---|
| `{ type: "system", content: "oi" }` | `outgoing` | `"oi"` |
| `{ type: "outgoing", content: "oi" }` | `outgoing` | `"oi"` |
| `{ type: "incoming", content: "oi" }` | `incoming` | `"oi"` |
| `{ type: "human", content: "oi" }` | `incoming` | `"oi"` |
| `{ content: "oi" }` (sem `type`) | `incoming` | `"oi"` |
| `{ type: "system" }` (sem `content`) | `outgoing` | `""` |
| `null` | `incoming` | `""` |
| `{ type: "system", content: { a: 1 } }` | `outgoing` | `""` (não vaza objeto) |

Round-trip: `decodeChatEnvelope(encodeOutboundAudit("x"))` → `{ direction: "outgoing", text: "x" }`.

Costura cruzada: adicionar um teste que importa `OUTBOUND_AUDIT_TYPE` do mesmo módulo usado pelo writer, garantindo que reader e writer compartilham o discriminador (impede o drift silencioso de renomear a tag). O `src/actions/message-history.test.ts:61-67` deve construir o envelope via `encodeOutboundAudit` em vez de hardcodar `{ type: "system", ... }`, fazendo o teste cruzar a mesma costura.

**Riscos & migração**

- Sem migração de schema. Dados existentes em `ChatHistory.message` continuam com shape `{ type, content }` e são decodificados corretamente por `decodeChatEnvelope`.
- Comportamento preservado para os casos válidos atuais; muda apenas o caso de fallback (deixa de vazar JSON cru). Isso é melhoria de UI, não regressão.
- Deploy único, sem ordem especial.

**Nota de escopo (não fazer agora):** **não** transformar isto em uma máquina de tipos profunda para todos os produtores hipotéticos. O cenário "N8N escreve `incoming` com outro shape" é especulativo — não há produtor de `incoming` no repo hoje. A lógica atrás da costura é fina; o ganho é **localidade + pin de um discriminador + teste que cruza a costura**, não profundidade. Manter o codec pequeno.

**Critérios de aceite**

- [x] `src/lib/chat-envelope.ts` existe com `OUTBOUND_AUDIT_TYPE`, `encodeOutboundAudit`, `decodeChatEnvelope`.
- [x] Writer (`worker.ts`) e reader (`message-history.ts`) usam o codec; nenhum literal `"system"` solto para direção.
- [x] O fallback de `JSON.stringify(msg.message)` foi removido — UI nunca recebe JSON cru.
- [x] Existe teste que cruza a costura writer↔reader compartilhando `OUTBOUND_AUDIT_TYPE`.
- [x] `src/actions/message-history.test.ts` continua verde e constrói o envelope via `encodeOutboundAudit`.

---

## Ordem de execução

1. **Ponto 1, movimento (a)** — criar `campaign-message-lifecycle.ts` com `MAX_RETRIES`, `eligibleForSendWhere`, `unfinishedMessagesWhere`; trocar os call sites em `worker.ts` e importar literais em `campaigns.ts`. Rodar `worker.test.ts` (deve continuar verde). Corrige o drift de conclusão.
2. **Ponto 1, movimento (b)** — adicionar `applyOutcome` e mover `calculateDelay` para o módulo; refatorar o `try/catch` do worker para delegar a decisão. Escrever `campaign-message-lifecycle.test.ts` (unit puro).
3. **Ponto 2** — criar `chat-envelope.ts`; trocar writer e reader; remover o fallback de `JSON.stringify`. Escrever `chat-envelope.test.ts` e ajustar `message-history.test.ts` para cruzar a costura.
4. Suíte completa de testes; revisar o painel de campanhas para a mudança visível de conclusão (se `DEAD_LETTER` entrou em `UNFINISHED_STATUSES`).

Os pontos 1 e 2 são independentes e podem ser feitos em PRs separados; o movimento (a) precede o (b) dentro do Ponto 1.

## Nota de verificação

A verificação adversarial **confirmou** o Ponto 1: a divergência entre a query do worker (só `FAILED` com `retryCount < MAX_RETRIES`), `updateCampaignStatuses` (qualquer `FAILED`, ignora `DEAD_LETTER`) e as ações de campanha é real e está nas linhas citadas; o teste atual de fato só exercita a regra `FAILED`-vs-`DEAD_LETTER` atravessando `processAllTenantMessages` com tudo mockado. A severidade foi **revisada para Média** porque o bug #1 (completar cedo demais) hoje é mascarado pelo worker mover falhas terminais para `DEAD_LETTER` antes do cap — é drift latente, não falha ativa garantida; ainda assim, as definições já discordam e qualquer mexida reabre o buraco, o que justifica a costura (passa no teste de deleção: a complexidade reaparece em 4 chamadores). O Ponto 2 também foi confirmado (writer/reader/`chat.ts` nas linhas citadas, sem teste cruzando a costura), mas a severidade fica em **Baixa-Média**: a ressalva é não fazer over-engineering — o cenário do N8N escrevendo `incoming` com outro shape é especulativo (nenhum produtor de `incoming` existe no repo), então o valor está em localidade, pin de um discriminador e teste de costura, **não** em profundidade. O codec deve permanecer fino.

---

## Resultado da implementação (2026-06-22)

O que efetivamente foi construído — onde diverge do plano acima, **esta seção manda**.

### Decisões de estado
- **`UNFINISHED_STATUSES = ["PENDING", "FAILED"]`** — o plano propunha `["PENDING","PROCESSING","FAILED","DEAD_LETTER"]`. Os **dois** estados extras foram excluídos:
  - **DEAD_LETTER** (decisão do produto): **terminal para conclusão**. Campanha COMPLETA mesmo com dead letters; ficam visíveis e reentráveis manualmente. Mantém vivo o ramo `retryCampaignDeadLetters`/`retryDeadLetterMessage` (COMPLETED → PROCESSING).
  - **PROCESSING** (achado de revisão adversarial, **high-sev**): incluí-lo criava um **estado de campanha presa para sempre**. PROCESSING é marcado *fora* do `try` (antes do envio) e **nunca** é re-selecionado por `eligibleForSendWhere` — não há caminho de recuperação. Um cron morto (timeout/crash de 300s; batch de 20 msgs × até 30s de delay) entre a marca e a transição terminal deixaria a mensagem órfã e a campanha travada. Excluir reproduz o contrato deliberado do código original (`[PENDING, FAILED]`): a campanha auto-cura e conclui. Invariante agora explícita no módulo + **teste de regressão** garante que todo status que bloqueia conclusão é re-selecionável pelo worker. (Gap pré-existente — mensagem órfã perdida — fica fora de escopo; `updatedAt` já existe e habilitaria um requeue por janela numa sprint futura.)
- A consolidação ainda entrega **todos** os ganhos do sprint: fonte única (worker query ↔ `updateCampaignStatuses` referenciam o módulo, não podem mais divergir), bug #2 corrigido (`applyOutcome` nunca persiste FAILED-no-cap → tudo em `UNFINISHED` é drenável pelo worker), e a decisão DEAD_LETTER centralizada numa linha.

### Desvio do plano — `src/actions/campaigns.ts` NÃO editado
O plano sugeria importar `MAX_RETRIES` e literais de status. **Não feito**: `campaigns.ts` não usa `MAX_RETRIES` numericamente (só `retryCount: 0` em resets e literais de enum `"DEAD_LETTER"` já tipados pelo Prisma). Import não usado quebraria `no-unused-vars`; um set paralelo de consts de status brigaria com a convenção do repo (literais crus checados pelo Prisma em todo lugar). Não é critério de aceite — só item da tabela "arquivos afetados". Alinhado ao ADR-0005 (sem costuras prematuras).

### Revisão adversarial (workflow, 6 agentes)
- **2 confirmados** (mesma causa: PROCESSING em `UNFINISHED`) → corrigidos (exclusão + invariante + teste).
- **1 descartado**: remover o fallback `JSON.stringify` "perderia texto de `incoming` do N8N" — improcedente: N8N deve conformar ao envelope `{ type, content }` (CONTEXT.md), e o fallback antigo era ele próprio um bug documentado (vazava JSON cru no balão).

### Gate (Definition of Done)
`lint` 0-erros (warns estruturais pré-existentes em `worker.ts` reduzidos de 4→2) · `typecheck` verde · **190 testes** verdes (2 suítes puras novas, sem mock de prisma/evolution/setTimeout) · `build` verde. Nenhum teste removido/editado para passar.
