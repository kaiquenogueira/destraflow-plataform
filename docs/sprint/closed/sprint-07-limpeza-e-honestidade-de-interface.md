# Sprint 07 — Limpeza de código morto e honestidade de interface

> - **Prioridade:** Baixa
> - **Complexidade:** Baixa
> - **Esforço estimado:** 1–2 dias
> - **Dependências:** Nenhuma
> - **Subsistemas:** Leitura de histórico de chat, Contexto de tenant, Autorização (gates), Integração Evolution
> - **Status:** Concluído (2026-06-22) — `chat.ts` deletado; `userRole` removido do `TenantContext` (path b, [ADR-0006](../../adr/0006-tenant-action-authorization.md)); helpers `evolution-config` + `principal` extraídos; nit de import em `admin.ts`. Gates verdes; revisão adversarial sem defeitos.

## Resumo executivo

Este sprint elimina três fontes de ruído estrutural no repositório, todas de baixo esforço e alta clareza. Primeiro, remove um arquivo de readers de chat (`src/actions/chat.ts`) que não tem nenhum consumidor e que duplica — de forma divergente e sem normalização — o reader canônico em `src/actions/message-history.ts`, atuando como armadilha (decoy) para mantenedores e IA. Segundo, torna honesta a interface de `TenantContext`, removendo (ou tornando load-bearing) o campo `userRole`, hoje populado mas sem nenhum consumidor — uma promessa de profundidade que o módulo não cumpre. Terceiro, consolida dois pequenos duplicados de princípio: o idioma de configuração da Evolution e o preâmbulo de validação de sessão/principal compartilhado entre `requireAdmin` e `getTenantContext`. **Não há bug ao vivo**; os ganhos são de navegabilidade, testabilidade e honestidade de interface.

## Pontos abordados

1. Readers mortos e divergentes em `chat.ts` (decoy do reader canônico).
2. `TenantContext.userRole` é campo de interface mentiroso (pass-through sem consumidor).
3. Dedups estreitos: config Evolution duplicada e preâmbulo de principal triplicado (com nit de import dinâmico em `admin.ts`).

---

### Ponto 1 — Readers mortos e divergentes em `chat.ts`

**Problema**

`src/actions/chat.ts` exporta quatro server actions de leitura — `getChatHistoryByContact` (`chat.ts:15`), `getChatHistoryByLead` (`chat.ts:47`), `getRecentMessages` (`chat.ts:86`) e `getChatStats` (`chat.ts:122`). A função `getChatHistoryByLead` executa **exatamente** a mesma caminhada `lead → phone → whatsAppContact.findFirst → chatHistory.findMany` que o reader canônico `getMessageHistoryByLead` em `src/actions/message-history.ts:23`, mas devolve linhas cruas do Prisma, sem normalização e **sem o fallback para a Evolution API**.

Trecho atual do decoy (`chat.ts:47-81`):

```ts
export async function getChatHistoryByLead(leadId: string) {
    const context = await getTenantContext();
    if (!context) {
        return { messages: [], contact: null };
    }
    const { tenantPrisma } = context;

    const lead = await tenantPrisma.lead.findUnique({
        where: { id: leadId },
        select: { phone: true },
    });
    if (!lead) {
        throw new Error("Lead não encontrado");
    }

    const contact = await tenantPrisma.whatsAppContact.findFirst({
        where: { whatsapp: lead.phone },
    });
    if (!contact) {
        return { messages: [], contact: null };
    }

    const messages = await tenantPrisma.chatHistory.findMany({
        where: { userId: contact.id },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    return { messages, contact };
}
```

Reader canônico equivalente (`message-history.ts:23-62` + helper `getMessagesFromDatabase` em `message-history.ts:67-99`): mesma caminhada, mas devolve `NormalizedMessage[]` (`message-history.ts:11-18`) e cai para a Evolution API quando o DB está vazio.

Grep confirma **zero consumidores**: nenhum arquivo importa `@/actions/chat` (`grep -rn "actions/chat" src` retorna nada), e as únicas ocorrências dos quatro nomes estão na própria definição em `chat.ts`. Não existe `chat.test.ts`. Aplicando o **teste de deleção**: apagar o arquivo → a complexidade SOME e zero callers são afetados. Isso é **peso morto** — e pior que neutro, porque é um **decoy**: um mantenedor (ou uma IA) procurando "como ler histórico por lead" encontra dois readers, sendo que o errado (sem normalização, sem fallback) parece igualmente legítimo.

**Causa raiz**

Um único conceito — "ler o histórico de conversa de um lead" — ficou implementado em dois lugares. A versão de `message-history.ts` evoluiu (normalização + fallback Evolution) e a de `chat.ts` ficou para trás e perdeu todos os callers, mas nunca foi removida. Duas implementações do mesmo conceito, uma viva e uma morta, com a morta se passando por interface canônica.

**Impacto / bug observável**

Puramente estrutural — não há bug ao vivo, pois nada chama `chat.ts`. O risco é latente: se algum dev futuro religar `getChatHistoryByLead` por engano, a tela renderizaria linhas cruas de `chatHistory` (campo `message` como JSON bruto, sem direção/timestamp normalizados) e **sem o fallback Evolution**, ou seja, sumiriam mensagens que só existem no provedor.

**Solução técnica detalhada**

1. Reconfirmar a ausência de consumidores imediatamente antes de deletar:
   ```bash
   grep -rn "actions/chat" src
   grep -rn "getChatHistoryByLead\|getChatHistoryByContact\|getRecentMessages\|getChatStats" src
   ```
   Esperado: apenas as definições em `src/actions/chat.ts`.
2. **Deletar o arquivo inteiro** `src/actions/chat.ts`. Todas as quatro funções estão sem importadores; não há nada a preservar.
3. **NÃO** extrair um helper compartilhado `findContactByPhone` a partir do `whatsAppContact.findFirst`. Após a deleção, o idioma `findFirst({ where: { whatsapp: phone } })` sobra em apenas dois lugares com semânticas distintas: o worker (`find-or-create`) e `message-history.ts` (`getMessagesFromDatabase`, read-only). Unificar um `findFirst` de duas linhas com semânticas divergentes seria uma **costura prematura de 1 adaptador** — não passa no critério "2 adaptadores = costura real".
4. Observação de arquitetura: a resolução canônica de **contato por telefone** pertence ao módulo previsto no **Sprint 02**; este sprint apenas remove o duplicado morto e não antecipa aquela costura.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
| --- | --- | --- |
| `src/actions/chat.ts` | Excluir | Remove `getChatHistoryByContact`, `getChatHistoryByLead`, `getRecentMessages`, `getChatStats` — todos sem consumidores. |

**Plano de testes**

- Não há `chat.test.ts` para ajustar (não existe).
- Validação primária é o compilador + grep: após a deleção, `tsc --noEmit` (ou `pnpm build`) deve passar sem erros de import quebrado, comprovando zero consumidores.
- Rodar a suíte existente para garantir não-regressão (especialmente `src/actions/message-history.test.ts`, o reader que permanece como canônico).

| Verificação | Entrada | Saída esperada |
| --- | --- | --- |
| Grep de import | `grep -rn "actions/chat" src` | nenhuma linha |
| Typecheck | `tsc --noEmit` | sem erros |
| Suíte | `pnpm test` | verde |

**Riscos & migração**

Risco mínimo. Nenhum dado, nenhuma migração, nenhuma ordem de deploy. Único cuidado: confirmar o grep no momento da remoção (caso uma branch paralela tenha religado o arquivo).

**Critérios de aceite**

- [ ] `grep -rn "actions/chat" src` não retorna nenhum import.
- [ ] `src/actions/chat.ts` removido do repositório.
- [ ] `tsc --noEmit` passa sem erros.
- [ ] Suíte de testes verde.
- [ ] Nenhum helper `findContactByPhone` foi extraído (decisão registrada para o Sprint 02).

---

### Ponto 2 — `TenantContext.userRole` é campo de interface mentiroso

**Problema**

A interface `TenantContext` declara `userRole: "ADMIN" | "USER"` (`tenant.ts:10`) e o resolver o popula em `tenant.ts:53`:

```ts
export interface TenantContext {
    userId: string;
    userRole: "ADMIN" | "USER";   // tenant.ts:10
    tenantPrisma: TenantPrismaClient;
    ...
}
```
```ts
    return {
        userId: user.id,
        userRole: user.role,        // tenant.ts:53
        tenantPrisma: getTenantPrisma(databaseUrl),
        ...
    };
```

Grep em `src` (excluindo testes) acha **zero consumidores** de `userRole`: as únicas referências fora de `tenant.ts` estão em fixtures de teste (`src/lib/tenant.test.ts:46`, `src/actions/leads.test.ts:39`), que apenas reproduzem o shape. Nenhum call site lê `context.userRole` para decidir nada.

Aplicando o **teste de deleção**: remover `userRole` da interface e do retorno não muda nada em runtime e não quebra a compilação (fora dos fixtures de teste, que são triviais de ajustar). Isso é um **pass-through** que **anuncia uma profundidade que o módulo não tem** — clássico cheiro de interface rasa: o campo sugere que `TenantContext` carrega informação de autorização por papel, quando na prática nenhum gate de ação de tenant consulta esse papel.

> **Correção (reverificação 2026-06-20):** a análise original afirmava "não existe `middleware.ts`". **Errado** — o Next 16 renomeou `middleware`→`proxy`, e existe `src/proxy.ts` via `withAuth` do NextAuth. Ele **autentica todas as rotas de feature** (matcher: `/dashboard`, `/admin`, `/leads`, `/campaigns`, `/templates`, `/whatsapp`, `/notifications`, `/login`, `/api/cron`), redireciona não-autenticados para `/login`, faz **rate limiting** (60/min via Upstash/fallback) e **gateia `/admin` por papel**: `token?.role !== "ADMIN"` → redirect para `/dashboard` (`proxy.ts:91-95`). Logo, autorização por papel **já existe na borda** para a área admin, somada a `requireAdmin` (`admin-auth.ts:5`) nas ações de `/admin`. O que **não** acontece é alguma ação de tenant ler `context.userRole` — esse campo não participa de nenhum gate; a autorização vive no `proxy.ts` (rotas) e em `requireAdmin` (ações admin), não em `getTenantContext`.

**Causa raiz**

A interface promete uma garantia de autorização (o papel do principal) que nenhuma camada consome. O fato mais importante sobre acesso a ações de tenant — "qualquer USER autenticado com `databaseUrl` configurado alcança toda ação de tenant" — fica escondido atrás de um campo que parece, mas não é, um gate.

**Impacto / bug observável**

Estrutural, **não é vulnerabilidade** (reforçado pela reverificação acima). Toda rota de feature exige autenticação no `proxy.ts` e `/admin` exige papel `ADMIN` (middleware + `requireAdmin`). Que um `USER` autenticado alcance as ações do **próprio** tenant é **por design** — 1 tenant por `databaseUrl`, o USER é o dono dos seus dados. O único resíduo real é `TenantContext.userRole` ser **populado e nunca lido**: interface que anuncia um gate que, nesta camada, não existe. Não há acesso indevido a corrigir — há um **campo morto** a remover (ou a tornar load-bearing caso surjam papéis intra-tenant no futuro). Severidade baixa.

**Solução técnica detalhada**

Decisão de produto, dois caminhos mutuamente exclusivos:

**(a) Se autorização por papel É requisito para ações de tenant** — tornar `userRole` load-bearing e testável na costura:
1. Manter o campo na interface.
2. Aplicar o gate no próprio resolver ou em wrappers explícitos. Assinatura sugerida de um gate fino, no mesmo módulo `src/lib/tenant.ts`:
   ```ts
   /** Resolve o contexto e exige que o principal tenha papel >= o requerido. */
   export async function requireTenantContext(
       minRole: "USER" | "ADMIN" = "USER"
   ): Promise<TenantContext> {
       const ctx = await getTenantContext();
       if (!ctx) throw new Error("Banco de dados não configurado");
       if (minRole === "ADMIN" && ctx.userRole !== "ADMIN") {
           throw new Error("Acesso negado. Apenas administradores.");
       }
       return ctx;
   }
   ```
3. Migrar as ações de tenant que exigem papel para `requireTenantContext("ADMIN")`. Agora `userRole` é consumido e a costura é testável (mockar `userRole` e asserir o throw).

**(b) Se não é requisito (recomendado pela ausência de qualquer consumidor hoje)** — **deletar** `userRole` para a interface parar de prometer o que não entrega:
1. Remover `userRole: "ADMIN" | "USER";` de `TenantContext` (`tenant.ts:10`).
2. Remover `userRole: user.role,` do retorno (`tenant.ts:53`).
3. Manter `role: true` no `select` (`tenant.ts:30-37`) **somente** se algo mais usar; como nada usa, remover `role` do `select` também (micro-otimização opcional).
4. Ajustar os fixtures de teste que referenciam `userRole` (`src/lib/tenant.test.ts:46`, `src/actions/leads.test.ts:39`) removendo a chave.

Em qualquer dos caminhos, **documentar a decisão** num ADR curto: "ações de tenant são gateadas por autenticação + posse de `databaseUrl`; a distinção USER/ADMIN dentro do tenant é (indefinida | exigida via `requireTenantContext`)".

**Arquivos afetados**

| Arquivo | Ação | O que muda |
| --- | --- | --- |
| `src/lib/tenant.ts` | Editar | Caminho (b): remover `userRole` da interface e do retorno. Caminho (a): adicionar `requireTenantContext`. |
| `src/lib/tenant.test.ts` | Editar | Ajustar fixture (`:46`). |
| `src/actions/leads.test.ts` | Editar | Ajustar fixture (`:39`). |
| `docs/adr/` | Novo | ADR registrando a decisão de política de autorização de tenant. |

**Plano de testes**

Caminho (b):

| Caso | Entrada | Saída esperada |
| --- | --- | --- |
| Typecheck pós-remoção | shape sem `userRole` | sem erros TS |
| `tenant.test.ts` | fixture sem `userRole` | verde |

Caminho (a) — a nova costura `requireTenantContext` torna a autorização testável **sem** infraestrutura extra, mockando apenas `getTenantContext`:

| Caso | `getTenantContext()` mockado | `minRole` | Saída esperada |
| --- | --- | --- | --- |
| USER pede ação USER | `{ userRole: "USER", ... }` | `"USER"` | retorna contexto |
| USER pede ação ADMIN | `{ userRole: "USER", ... }` | `"ADMIN"` | lança "Acesso negado..." |
| ADMIN pede ação ADMIN | `{ userRole: "ADMIN", ... }` | `"ADMIN"` | retorna contexto |
| sem banco | `null` | qualquer | lança "Banco de dados não configurado" |

**Riscos & migração**

Sem dados, sem backfill. Risco do caminho (a): se aplicado a ações que hoje USERs legitimamente executam, pode bloquear usuários — por isso a decisão de produto deve preceder a implementação. Risco do caminho (b): nenhum funcional; apenas garantir que nenhum consumidor futuro já planejado dependa do campo.

**Critérios de aceite**

- [ ] Decisão de política registrada em ADR.
- [ ] Caminho (b): `userRole` ausente de `TenantContext` e do retorno; fixtures ajustados; suíte verde. **OU**
- [ ] Caminho (a): `requireTenantContext` implementado, ao menos uma ação migrada, testes da costura cobrindo os quatro casos.
- [ ] `tsc --noEmit` passa.

---

### Ponto 3 — Dedups estreitos: config Evolution e preâmbulo de principal

Três sub-itens; (a) e (b) são consolidações reais, (c) é nit.

#### (a) Idioma de configuração da Evolution duplicado

**Problema**

`src/actions/whatsapp.ts:18-37` já encapsula o idioma "ler instância + apiKey do `crmUser`, decriptar e construir o client":

```ts
async function getUserEvolutionConfig() {
    const userId = await getCurrentUserId();
    const user = await prisma.crmUser.findUnique({
        where: { id: userId },
        select: { evolutionInstance: true, evolutionApiKey: true },
    });
    if (!user?.evolutionInstance) {
        throw new Error("Instância do WhatsApp não configurada");
    }
    return {
        instanceName: decrypt(user.evolutionInstance),
        apiKey: user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined,
    };
}
```

Esse helper é usado por 3 callers (`whatsapp.ts:41,61,80`). `message-history.ts:104-130` (`getMessagesFromEvolution`) reimplementa o **mesmo idioma inline**:

```ts
const user = await prisma.crmUser.findUnique({
    where: { id: session.user.id },
    select: { evolutionInstance: true, evolutionApiKey: true },
});
if (!user?.evolutionInstance) return [];
const instanceName = decrypt(user.evolutionInstance);
const apiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined;
const client = createEvolutionClient(instanceName, apiKey);
```

Mesmo `select`, mesmo `decrypt` condicional do apiKey, mesma construção do client. Um conceito ("config Evolution do usuário logado") em dois lugares.

**Causa raiz**

O idioma de decriptação/construção do client vazou para dois módulos. A diferença é só o modo de erro (whatsapp lança, message-history retorna `[]` no fallback), o que não justifica duas implementações do parsing.

**Impacto / bug observável**

Estrutural. Risco latente: se a forma do `select` ou da decriptação mudar (ex.: novo campo `evolutionUrl`), há dois lugares a atualizar e um pode ficar para trás.

**Solução técnica detalhada**

1. Promover o helper a um escopo compartilhado, consumido **apenas** por esses dois módulos. Caminho sugerido: `src/lib/evolution-config.ts`. Assinatura:
   ```ts
   /** Config Evolution do principal autenticado. Lança se não houver instância. */
   export async function getUserEvolutionConfig(userId: string): Promise<{
       instanceName: string;
       apiKey?: string;
   }> { /* select + decrypt como em whatsapp.ts:18-37 */ }
   ```
   Tornar `userId` parâmetro explícito mantém o helper puro quanto à origem da sessão (whatsapp passa `getCurrentUserId()`, message-history passa `session.user.id`).
2. `whatsapp.ts`: substituir o helper local por import do compartilhado, passando `await getCurrentUserId()`.
3. `message-history.ts` (`getMessagesFromEvolution`): substituir o bloco inline `:109-122` por:
   ```ts
   const session = await getServerSession(authConfig);
   if (!session?.user?.id) return [];
   let config;
   try {
       config = await getUserEvolutionConfig(session.user.id);
   } catch {
       return []; // mantém semântica de fallback silencioso
   }
   const client = createEvolutionClient(config.instanceName, config.apiKey);
   const messages = await client.fetchMessages(phone, { limit: 50 });
   return normalizeEvolutionMessages(messages);
   ```
   O `try/catch` preserva o comportamento atual (fallback retorna `[]`, nunca lança).
4. **NÃO** forçar o worker por esse helper (lê config em batch, sessionless, acoplado a `databaseUrl`) nem o dashboard (split presentacional). A costura cobre só os dois módulos com a mesma origem (principal autenticado).

#### (b) Preâmbulo de principal triplicado

**Problema**

`requireAdmin` (`admin-auth.ts:5-22`) e `getTenantContext` (`tenant.ts:21-59`) repetem o preâmbulo "pegar sessão → `prisma.crmUser.findUnique` → validar", cada um com strings de erro distintas:

- `admin-auth.ts:9` → `"Não autorizado"` (sem sessão)
- `admin-auth.ts:18` → `"Acesso negado. Apenas administradores."`
- `tenant.ts:25` → `"Não autorizado"` (sem sessão)
- `tenant.ts:41` → `"Usuário não encontrado"`

```ts
// admin-auth.ts:6-15
const session = await getServerSession(authConfig);
if (!session?.user?.id) throw new Error("Não autorizado");
const user = await prisma.crmUser.findUnique({
    where: { id: session.user.id },
    select: { role: true },
});
```
```ts
// tenant.ts:22-42
const session = await getServerSession(authConfig);
if (!session?.user?.id) throw new Error("Não autorizado");
const user = await prisma.crmUser.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, databaseUrl: true, ... },
});
if (!user) throw new Error("Usuário não encontrado");
```

Mesmo preâmbulo, vocabulário de erro divergente em três strings.

**Causa raiz**

O conceito "validar o principal a partir da sessão" está espalhado por dois gates, sem dono. As mensagens de erro divergem porque ninguém é responsável por esse vocabulário.

**Impacto / bug observável**

Estrutural. Inconsistência de mensagens de erro entre gates é o sintoma visível mais próximo do usuário/dev.

**Solução técnica detalhada**

1. Extrair `validatePrincipal(session)` que retorna o `crmUser` validado e é **dono do vocabulário de erro**. Caminho sugerido: `src/lib/principal.ts`.
   ```ts
   import type { Session } from "next-auth";

   export interface Principal { id: string; role: "ADMIN" | "USER"; }

   /** Valida a sessão e devolve o principal. Único dono das mensagens de erro de identidade. */
   export async function validatePrincipal(session: Session | null): Promise<Principal> {
       if (!session?.user?.id) throw new Error("Não autorizado");
       const user = await prisma.crmUser.findUnique({
           where: { id: session.user.id },
           select: { id: true, role: true },
       });
       if (!user) throw new Error("Usuário não encontrado");
       return user;
   }
   ```
2. `requireAdmin` passa a chamar `validatePrincipal` e **aplica o próprio gate**:
   ```ts
   export async function requireAdmin() {
       const session = await getServerSession(authConfig);
       const principal = await validatePrincipal(session);
       if (principal.role !== "ADMIN") {
           throw new Error("Acesso negado. Apenas administradores.");
       }
       return principal.id;
   }
   ```
3. `getTenantContext` chama `validatePrincipal` para a parte de identidade e mantém o `findUnique` adicional dos campos de tenant (`databaseUrl`, `aiMessages*`), ou amplia o `select` do principal — escolher mantendo o resolver responsável apenas pela resolução do tenant. O gate de "sem `databaseUrl` → null" (`tenant.ts:45-47`) permanece no resolver.
4. **RESSALVA — NÃO tocar** na re-query do callback `session()` em `auth.ts:57-76`. Aquela `findUnique` é uma checagem de segurança A07 deliberada (revalida que o usuário ainda existe a cada requisição, invalidando sessões de usuários deletados) que vive numa camada diferente (NextAuth). Não é duplicação a eliminar.
5. **NÃO** justificar a extração por memoização via `cache()`: cada gate é chamado no máximo 1x por request; o ganho é honestidade/dono do vocabulário, não performance.

#### (c) Nit: imports dinâmicos desnecessários em `admin.ts`

**Problema**

`admin.ts:220-221`, dentro de `getUserNotifications`, faz imports dinâmicos:

```ts
const { getTenantPrisma } = await import("@/lib/prisma");
const { decrypt } = await import("@/lib/encryption");
```

`decrypt` já está importado estaticamente no topo (`admin.ts:9`: `import { encrypt, decrypt, hashString } from "@/lib/encryption";`) e `prisma` (de `@/lib/prisma`) também é estático (`admin.ts:5`), embora `getTenantPrisma` não esteja no destructuring atual.

**Causa raiz**

Imports dinâmicos copiados de outro contexto, sem necessidade — o módulo já está no grafo estático.

**Solução técnica detalhada**

1. Adicionar `getTenantPrisma` ao import estático existente: `import { prisma, getTenantPrisma } from "@/lib/prisma";` (`admin.ts:5`).
2. Remover as duas linhas de `await import(...)` em `admin.ts:220-221`; usar `decrypt` e `getTenantPrisma` diretamente.

**Arquivos afetados (Ponto 3 inteiro)**

| Arquivo | Ação | O que muda |
| --- | --- | --- |
| `src/lib/evolution-config.ts` | Novo | Helper `getUserEvolutionConfig(userId)` compartilhado. |
| `src/actions/whatsapp.ts` | Editar | Usa o helper compartilhado; remove o local (`:18-37`). |
| `src/actions/message-history.ts` | Editar | `getMessagesFromEvolution` reusa o helper (`:109-122`). |
| `src/lib/principal.ts` | Novo | `validatePrincipal(session)` dono do vocabulário de erro. |
| `src/lib/admin-auth.ts` | Editar | `requireAdmin` chama `validatePrincipal` e aplica gate ADMIN. |
| `src/lib/tenant.ts` | Editar | `getTenantContext` usa `validatePrincipal` para identidade. |
| `src/actions/admin.ts` | Editar | Imports estáticos no lugar dos dinâmicos (`:5`, `:220-221`). |
| `src/lib/auth.ts` | Inalterado | Re-query A07 do callback `session()` preservada (ressalva). |

**Plano de testes (Ponto 3)**

A nova costura `validatePrincipal` torna a validação de identidade testável **uma vez**, sem repetir mocks de sessão em cada gate:

| Caso | `session` | `crmUser.findUnique` | Saída esperada |
| --- | --- | --- | --- |
| sem sessão | `null` | — | lança "Não autorizado" |
| usuário inexistente | `{ user: { id: "x" } }` | `null` | lança "Usuário não encontrado" |
| principal válido | `{ user: { id: "x" } }` | `{ id: "x", role: "USER" }` | retorna `{ id, role }` |

Gates passam a testar apenas seu próprio gate sobre o principal mockado:

| Gate | `validatePrincipal` mockado | Saída esperada |
| --- | --- | --- |
| `requireAdmin` | `{ role: "USER" }` | lança "Acesso negado..." |
| `requireAdmin` | `{ role: "ADMIN" }` | retorna id |

Para o helper Evolution, `message-history.test.ts` (já mocka `@/lib/prisma`, `@/lib/encryption`, `@/lib/evolution` em `:20,28,32`) passa a mockar `@/lib/evolution-config` e o cenário de fallback (`:88,105,108`) continua válido. Verificar que o `try/catch` mantém o retorno `[]` quando o helper lança.

Arquivos de teste a ajustar/criar:
- Novo `src/lib/principal.test.ts` (três casos acima).
- `src/actions/whatsapp.test.ts`, `src/actions/message-history.test.ts`, `src/actions/admin.test.ts`, `src/lib/tenant.test.ts` — ajustar mocks para a nova costura, mantendo asserts de comportamento.

**Riscos & migração**

Sem dados, sem backfill, sem ordem de deploy especial. Riscos: (i) preservar exatamente as mensagens de erro existentes para não quebrar asserts/UX; (ii) preservar a semântica de fallback silencioso em `getMessagesFromEvolution` (retorna `[]`, nunca propaga throw); (iii) **não** mexer no callback `session()` de `auth.ts`.

**Critérios de aceite (Ponto 3)**

- [ ] `getUserEvolutionConfig` em módulo compartilhado, consumido por `whatsapp.ts` e `message-history.ts`; sem idioma inline duplicado.
- [ ] `validatePrincipal` extraído; `requireAdmin` e `getTenantContext` o consomem; mensagens de erro preservadas e centralizadas.
- [ ] Re-query A07 em `auth.ts:57-76` intacta.
- [ ] Imports dinâmicos de `admin.ts:220-221` substituídos por estáticos.
- [ ] Suíte verde, incluindo novo `principal.test.ts`.
- [ ] Worker e dashboard **não** foram forçados pelo helper Evolution.

---

## Ordem de execução

1. **Ponto 1** (deleção de `chat.ts`) — isolado, sem dependências; remove o decoy primeiro para reduzir ruído.
2. **Ponto 2** (decisão `userRole`) — registrar ADR antes de codar; depois aplicar caminho (a) ou (b).
3. **Ponto 3c** (nit de imports em `admin.ts`) — trivial, independente.
4. **Ponto 3a** (helper Evolution compartilhado) — `whatsapp.ts` + `message-history.ts`.
5. **Ponto 3b** (`validatePrincipal`) — extrair e religar `requireAdmin` e `getTenantContext`; preservar `auth.ts`.
6. Typecheck + suíte completa ao final.

## Nota de verificação

A verificação adversarial **confirmou** os três pontos. Ponto 1: grep mostra zero importadores de `@/actions/chat` e nenhum `chat.test.ts` — `getChatHistoryByLead` é réplica divergente (sem normalização nem fallback Evolution) do canônico `message-history.ts:getMessageHistoryByLead`; deleção segura, severidade média-baixa (ganho de navegabilidade + remoção de decoy). A verificação **rejeitou** extrair `findContactByPhone` agora: após a deleção sobram apenas worker (find-or-create) e message-history (read-only) com semânticas distintas sobre um `findFirst` de duas linhas — costura prematura de 1 adaptador; a resolução canônica pertence ao Sprint 02. Ponto 2 (**revisado após reverificação**): `userRole` é populado em `tenant.ts:53` mas tem zero consumidores fora de fixtures — campo morto/interface rasa. **A tese original "não existe middleware / qualquer USER alcança tudo" está REFUTADA:** existe `src/proxy.ts` (Next 16 renomeou middleware→proxy) que autentica todas as rotas e **gateia `/admin` por papel** (`proxy.ts:91-95`), somado a `requireAdmin` nas ações admin. Não há ausência de autorização; o ponto reduz-se a remover o campo morto (caminho b, recomendado) ou torná-lo load-bearing (caminho a). Severidade baixa, **sem vuln**. Nota: o `requireTenantContext` do caminho (a) se sobrepõe ao do Sprint 05 — se ambos forem feitos, unifique numa só assinatura. Ponto 3: dedups confirmados de severidade baixa; ressalvas mantidas — **não** unificar worker/dashboard pelo helper Evolution, **não** eliminar a re-query A07 de `auth.ts` (segurança deliberada em outra camada) e **não** justificar a extração por `cache()` (cada gate roda no máximo 1x por request). O nit 3c é parcial: `decrypt` já é estático em `admin.ts:9`, mas `getTenantPrisma` precisa ser adicionado ao import estático de `@/lib/prisma` (`admin.ts:5`) ao remover os `await import`.
