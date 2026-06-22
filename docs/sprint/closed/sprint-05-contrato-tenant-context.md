# Sprint 05 — Contrato do TenantContext (require vs optional)

> - **Prioridade:** Média
> - **Complexidade:** Média
> - **Esforço estimado:** 2–3 dias
> - **Dependências:** Nenhuma (refator amplo, porém mecânico)
> - **Subsistemas:** Camada de Server Actions (leads, campanhas, chat, contatos, notificações, templates, notas, histórico de mensagens), resolução de tenant (`src/lib/tenant.ts`)
> - **Status:** ✅ Concluído (2026-06-22). Refator puro de código (sem migração de schema/dados). Gate verde: lint 0-err · typecheck · 189 testes · build. Costura dividida: 23 sites Grupo A → `requireTenantContext`, 16 sites Grupo B → `getOptionalTenantContext`; string canônica em `NO_TENANT_DB_MESSAGE`. Revisão adversarial (3 dimensões) sem achados.

## Resumo executivo

`getTenantContext()` retorna `TenantContext | null` (`src/lib/tenant.ts:21`), devolvendo `null` quando o usuário não tem `databaseUrl` (`src/lib/tenant.ts:45-47`). Essa decisão de política — "usuário sem banco de tenant" — vaza para **39 guards `if (!context)`** espalhados pela camada de actions, e cada chamador precisa reinventar o que fazer com o `null`. A verificação adversarial precisou a magnitude: desses 39 guards, **23 são a mesma linha idêntica** `throw new Error("Banco de dados não configurado")` (duplicação pura, string mágica), e **16 retornam shapes de estado-vazio genuinamente específicos do chamador** (que devem permanecer locais). Não há bug ao vivo — é um problema estrutural de costura mal posicionada: a interface esconde o fato mais importante (que o retorno pode ser `null`) atrás de um tipo silenciosamente nullable, criando risco de null-deref latente quando um novo chamador esquece o guard. A solução divide a costura por intenção: `requireTenantContext()` (não-null, lança o erro canônico) consolida os 23 sites mutating/by-id; `getOptionalTenantContext()` torna o estado-vazio um contrato **opt-in** para os 16 caminhos de leitura.

## Pontos abordados

1. Retorno nullable de `getTenantContext` vaza a política "sem DB de tenant" para 39 call sites, com 23 duplicando a mesma linha de `throw`.

---

### Ponto 1 — Retorno nullable de `getTenantContext` vaza a política "sem DB de tenant" pelos call sites

**Problema**

A interface de `getTenantContext` é `Promise<TenantContext | null>` e o JSDoc já admite o vazamento (`src/lib/tenant.ts:17-21`):

```ts
/**
 * Obtém o contexto do tenant atual baseado na sessão
 * Retorna null se o usuário não tem banco configurado (ex: admin)
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
```

O `null` nasce em um único ponto (`src/lib/tenant.ts:44-47`):

```ts
// Admin ou usuário sem banco configurado
if (!user.databaseUrl) {
    return null;
}
```

Mas a **decisão sobre o que fazer com o `null`** está replicada em 39 guards `if (!context)` na camada de actions. A análise adversarial separou esses guards em dois grupos com tratamentos opostos.

**Grupo A — 23 guards idênticos que apenas relançam o mesmo erro** (sites mutating ou by-id). Todos são byte-a-byte iguais:

```ts
const context = await getTenantContext();
if (!context) {
    throw new Error("Banco de dados não configurado");
}
const { tenantPrisma } = context;
```

Ocorrências confirmadas (23 no código-fonte de produção; a string aparece 28x no repo somando testes e a página de dashboard):

| Arquivo | Linhas dos guards de throw |
|---|---|
| `src/actions/leads.ts` | `26`, `42`, `62`, `85`, `191`, `304` |
| `src/actions/campaigns.ts` | `124`, `221`, `270`, `308`, `343`, `389`, `442` |
| `src/actions/contacts.ts` | `53`, `75` |
| `src/actions/notifications.ts` | `91`, `113` |
| `src/actions/templates.ts` | `30`, `47`, `67` (forma inline `if (!context) throw ...`) |
| `src/actions/notes.ts` | `16`, `55` |
| `src/actions/message-history.ts` | `28` |

A string `"Banco de dados não configurado"` não é centralizada em lugar nenhum — é uma string mágica literal em cada um dos 23 sites.

**Grupo B — 16 guards que retornam shapes de estado-vazio específicos do chamador** (caminhos de leitura). Estes **não** são duplicação; cada um devolve a forma exata que o consumidor daquela action espera:

```ts
// src/actions/contacts.ts:14-16
if (!context) {
    return { contacts: [], total: 0, pages: 0, currentPage: 1 };
}
```

```ts
// src/actions/leads.ts:108-117  (CONSUMIDO pela UI)
if (!context) {
    // Retorna vazio para admins sem banco
    return {
        leads: [],
        total: 0,
        pages: 0,
        currentPage: 1,
        noDatabaseConfigured: true,
    };
}
```

```ts
// src/actions/chat.ts:123-126
if (!context) {
    return { totalMessages: 0, todayMessages: 0, tokensUsed: 0 };
}
```

```ts
// src/actions/campaigns.ts:489-491
if (!context) {
    return { pending: 0, sent: 0, failed: 0 };
}
```

Outros sites do Grupo B: `notifications.ts:17` (`{notifications,total,pages,currentPage}`), `notifications.ts:67-69` (retorna `0`), `notifications.ts:131-133` (retorna `[]`), `leads.ts:213-216` (`{} as Record<LeadTag, number>`), `chat.ts:20-22`, `chat.ts:49-51`, `chat.ts:87-90`, `templates.ts:18-19` (`return []`), `notes.ts:37-39` (`return []`), `campaigns.ts:70-71` (`return []`), `campaigns.ts:179-188` (`{campaigns,...,noDatabaseConfigured:true}`).

O sentinel `noDatabaseConfigured: true` do Grupo B é genuinamente **consumido** pela UI:

```tsx
// src/app/(dashboard)/leads/page.tsx:61
if ("noDatabaseConfigured" in data && data.noDatabaseConfigured) {
    return ( /* tela "Banco de dados não configurado" */ );
}
```

```tsx
// src/app/(dashboard)/dashboard/page.tsx:229
if ("noDatabaseConfigured" in data && data.noDatabaseConfigured) {
    return ( /* aviso "Banco de dados não configurado" */ );
}
```

No vocabulário: `getTenantContext` hoje é uma **interface que esconde o fato mais importante** (pode retornar `null`) atrás de uma assinatura que parece sempre entregar contexto. A **costura** está no lugar errado — testes e chamadores precisam cruzar a mesma fronteira (`if (!context)`) e cada um decide a política sozinho. Aplicando o **teste de deleção** apenas ao Grupo A: se apagarmos os 23 guards, a complexidade não some — ela reaparece como um null-deref em runtime. Logo o ramo é necessário, mas está implementado 23 vezes em vez de uma.

**Causa raiz**

Um único conceito — "este usuário não tem banco de tenant, e a operação X não pode prosseguir" — está espalhado por N lugares porque a interface devolve um `null` polimórfico sem expressar a intenção do chamador. Operações **mutating/by-id** querem *abortar* (não faz sentido criar/atualizar/deletar sem banco); operações **de leitura de lista/estatística** querem *degradar graciosamente* para um shape vazio. A assinatura única `| null` força cada call site a reconstruir essa bifurcação manualmente. Para o Grupo A isso vira pura duplicação + string mágica; para o Grupo B é um contrato implícito (o `null` "significa" estado-vazio) que não está tipado e pode ser esquecido.

**Impacto / bug observável**

Não há bug ao vivo reproduzível hoje — todos os 39 sites têm o guard. O impacto é estrutural e de risco latente:

- **Null-deref latente:** qualquer nova action que faça `const { tenantPrisma } = await getTenantContext()` (esquecendo o guard) compila se a desestruturação for feita após um cast, ou explode em runtime com `Cannot read properties of null`. A interface não obriga o tratamento.
- **String mágica não centralizada:** mudar a mensagem PT-BR de erro exige editar 23 (ou 28) lugares; uma divergência tipográfica em um deles passa despercebida.
- **Custo de manutenção/teste:** 23 testes de action reasseveram o mesmo invariante (`rejects.toThrow("Banco de dados não configurado")`), testando 1 regra N vezes *passando pela costura* em vez de testá-la 1x no resolver.

**Solução técnica detalhada**

Dividir a costura por intenção, mantendo o resolver de sessão/DB único. O novo shape vive no próprio `src/lib/tenant.ts` (não precisa de arquivo novo — a localidade já é boa lá).

1. **Extrair o erro canônico** em uma constante exportada (centraliza a string PT-BR):

   ```ts
   // src/lib/tenant.ts
   export const NO_TENANT_DB_MESSAGE = "Banco de dados não configurado";

   export class NoTenantDatabaseError extends Error {
       constructor() {
           super(NO_TENANT_DB_MESSAGE);
           this.name = "NoTenantDatabaseError";
       }
   }
   ```

2. **Renomear o resolver atual para o caminho opcional** e manter um único ponto de `null`. Sugestão de assinaturas:

   ```ts
   // resolve sessão + usuário + tenantPrisma; null SÓ quando não há databaseUrl
   export const getOptionalTenantContext = cache(
       async (): Promise<TenantContext | null> => { /* corpo atual de getTenantContext */ }
   );

   // caminho "deve ter banco": nunca retorna null
   export async function requireTenantContext(): Promise<TenantContext> {
       const context = await getOptionalTenantContext();
       if (!context) {
           throw new NoTenantDatabaseError();
       }
       return context;
   }
   ```

   Observação de compatibilidade: para reduzir o blast radius do diff, podemos manter `getTenantContext` como **alias deprecado** de `getOptionalTenantContext` durante a migração e removê-lo no fim do sprint.

3. **Migrar os 23 sites do Grupo A** para `requireTenantContext()` e **deletar seus guards**:

   ```ts
   // ANTES — src/actions/leads.ts:23-28
   export async function createLead(data: z.infer<typeof createLeadSchema>) {
       const context = await getTenantContext();
       if (!context) {
           throw new Error("Banco de dados não configurado");
       }
       const { tenantPrisma } = context;
   ```

   ```ts
   // DEPOIS
   export async function createLead(data: z.infer<typeof createLeadSchema>) {
       const { tenantPrisma } = await requireTenantContext();
   ```

   Forma inline de `templates.ts` (`if (!context) throw ...`):

   ```ts
   // ANTES — src/actions/templates.ts:28-34
   const context = await getTenantContext();
   if (!context) throw new Error("Banco de dados não configurado");
   const validated = createTemplateSchema.parse(data);
   const template = await context.tenantPrisma.template.create({ ... });
   ```

   ```ts
   // DEPOIS
   const context = await requireTenantContext();
   const validated = createTemplateSchema.parse(data);
   const template = await context.tenantPrisma.template.create({ ... });
   ```

   Aplicar o mesmo padrão aos 23 sites listados na tabela do Grupo A.

4. **Migrar os 16 sites do Grupo B** para `getOptionalTenantContext()`, **mantendo cada shape vazio local** (NÃO colapsar em um fallback único). O ganho aqui é semântico: o nome explicita que `null` é esperado e tratado.

   ```ts
   // ANTES — src/actions/contacts.ts:13-16
   const context = await getTenantContext();
   if (!context) {
       return { contacts: [], total: 0, pages: 0, currentPage: 1 };
   }
   ```

   ```ts
   // DEPOIS
   const context = await getOptionalTenantContext();
   if (!context) {
       return { contacts: [], total: 0, pages: 0, currentPage: 1 };
   }
   ```

   O sentinel `noDatabaseConfigured: true` em `leads.ts:115` e `campaigns.ts:186` **permanece intacto** — é o contrato consumido por `leads/page.tsx:61` e `dashboard/page.tsx:229`.

5. **Por que NÃO colapsar os 16 shapes:** a verificação mostrou que um fallback genérico (ex.: `withTenant(emptyValue, fn)`) inverteria a dependência — o resolver passaria a conhecer os tipos de retorno de cada action — e deixaria a costura **mais rasa** (alavancagem cai, pois o chamador teria que ensinar o resolver sobre seu shape). Os 16 shapes são localidade legítima: cada um vive onde o consumidor o entende.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/tenant.ts` | editar | Adicionar `NO_TENANT_DB_MESSAGE`, `NoTenantDatabaseError`, `getOptionalTenantContext` (renomeado do atual), `requireTenantContext`. Manter alias deprecado `getTenantContext` durante migração. |
| `src/actions/leads.ts` | editar | 6 sites → `requireTenantContext()` (linhas 26, 42, 62, 85, 191, 304); 2 sites de leitura → `getOptionalTenantContext()` (108-117 mantém `noDatabaseConfigured`; 213-216). |
| `src/actions/campaigns.ts` | editar | 7 sites → `requireTenantContext()`; 4 sites de leitura → `getOptionalTenantContext()` (70-71, 179-188 mantém sentinel, 489-491). |
| `src/actions/contacts.ts` | editar | 2 throws (53, 75) → `requireTenantContext()`; 2 leituras (14-16, 111-113) → `getOptionalTenantContext()`. |
| `src/actions/chat.ts` | editar | 4 leituras (20-22, 49-51, 87-90, 123-126) → `getOptionalTenantContext()`. |
| `src/actions/notifications.ts` | editar | 2 throws (91, 113) → `requireTenantContext()`; 3 leituras (17-19, 67-69, 131-133) → `getOptionalTenantContext()`. |
| `src/actions/templates.ts` | editar | 3 throws inline (30, 47, 67) → `requireTenantContext()`; 1 leitura (18-19) → `getOptionalTenantContext()`. |
| `src/actions/notes.ts` | editar | 2 throws (16, 55) → `requireTenantContext()`; 1 leitura (37-39) → `getOptionalTenantContext()`. |
| `src/actions/message-history.ts` | editar | 1 throw (28) → `requireTenantContext()`. |
| `src/lib/tenant.test.ts` | editar | Acrescentar caso para `requireTenantContext` (resolve não-null / lança quando `null`); manter caso de `null` em `getOptionalTenantContext`. |
| `src/actions/leads.test.ts` | editar | Remover a reasserção do throw por-action (82); manter testes de fluxo feliz e shape vazio. |
| `src/actions/notes.test.ts`, `templates.test.ts` | editar | Remover reasserções `rejects.toThrow("Banco de dados não configurado")` (notes.test.ts:62, templates.test.ts:60). |
| `src/app/(dashboard)/leads/page.tsx`, `dashboard/page.tsx` | sem mudança | Continuam lendo `noDatabaseConfigured` (contrato preservado). |

**Plano de testes**

A nova costura torna o invariante "sem DB → aborta" testável **uma vez** no resolver, sem repetir mock de `getTenantContext` em cada action.

Teste central em `src/lib/tenant.test.ts`:

| Cenário | Entrada (mock) | Saída esperada |
|---|---|---|
| `requireTenantContext` com banco | `crmUser.databaseUrl = "encrypted-..."` | resolve `TenantContext` não-null |
| `requireTenantContext` sem banco | `crmUser.databaseUrl = null` | `rejects.toThrow(NO_TENANT_DB_MESSAGE)` (1 única vez) |
| `getOptionalTenantContext` sem banco | `databaseUrl = null` | `resolves.toBeNull()` (mantém caso atual em tenant.test.ts:51-69) |
| `getOptionalTenantContext` com banco | `databaseUrl = "encrypted-..."` | resolve contexto com `tenantPrisma` (mantém caso tenant.test.ts:26-49) |

Nas actions, os testes deixam de cruzar a costura para validar o throw:

| Arquivo de teste | Antes | Depois |
|---|---|---|
| `leads.test.ts:73-83` | `mockResolvedValue(null)` + `rejects.toThrow("Banco de dados não configurado")` em `createLead` | Removido (invariante coberto no resolver). Mock passa a usar `requireTenantContext`. |
| `notes.test.ts:62` | reasserção idêntica | Removido. |
| `templates.test.ts:60` | reasserção idêntica | Removido. |
| `leads.test.ts:193-205` | `getLeads` com `null` → shape vazio + `noDatabaseConfigured: true` | **Mantido** — agora mockando `getOptionalTenantContext`; valida o contrato do Grupo B. |
| `leads.test.ts:273-279` | `getLeadsByTag` com `null` → `{}` | **Mantido** (Grupo B). |

Ajuste de mock: onde os testes hoje fazem `vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }))` (ex.: `leads.test.ts:14-16`), passam a mockar `requireTenantContext` e/ou `getOptionalTenantContext` conforme a action exercitada. Para actions do Grupo A, o `mockResolvedValue(mockContext)` no `beforeEach` aponta para `requireTenantContext`.

Resultado quantitativo da costura: **23 testes de ramo `null` consolidam em ~2 testes no resolver**; os ~16 testes de shape vazio permanecem (agora explicitamente ligados a `getOptionalTenantContext`). Mensagem-chave: **"23 consolidam + 16 ganham contrato mais claro"**, não "39 somem".

**Riscos & migração**

- **Sem dados/migração de schema:** refator puramente de código TypeScript. Nenhum script de backfill, nenhuma mudança em Prisma.
- **Compatibilidade de comportamento:** o erro lançado mantém a **mesma mensagem** (`NO_TENANT_DB_MESSAGE === "Banco de dados não configurado"`), então qualquer UI/handler que faça match por string continua funcionando. O sentinel `noDatabaseConfigured` é preservado byte-a-byte.
- **Ordem de deploy:** deploy único; não há fase intermediária quebrada se o passo 2 (criar resolvers + alias) for o primeiro commit. Manter o alias `getTenantContext` até o último passo evita um diff atômico gigante e permite revisar por arquivo.
- **Risco de regressão por omissão:** ao deletar os 23 guards, garantir que a desestruturação `const { tenantPrisma } = await requireTenantContext()` substitua exatamente o bloco antigo. Um `grep` final por `if (!context)` deve cair de 39 para 16 (apenas Grupo B).
- **`cache()` do React:** `requireTenantContext` chama `getOptionalTenantContext` (que é `cache()`d), então a resolução de sessão/DB continua deduplicada por request; não há custo extra de query.

**Critérios de aceite**

- [ ] `src/lib/tenant.ts` exporta `requireTenantContext`, `getOptionalTenantContext`, `NO_TENANT_DB_MESSAGE` (e `NoTenantDatabaseError`).
- [ ] Os 23 sites do Grupo A usam `requireTenantContext()` e não contêm mais `if (!context) throw new Error("Banco de dados não configurado")`.
- [ ] `grep -rn 'if (!context)' src/actions/` retorna apenas os 16 sites do Grupo B.
- [ ] `grep -rn 'throw new Error("Banco de dados não configurado")' src/` retorna 0 (a string só existe em `NO_TENANT_DB_MESSAGE` e na UI estática de `dashboard/page.tsx`/`leads/page.tsx`).
- [ ] Os 16 shapes de estado-vazio do Grupo B permanecem inalterados; `noDatabaseConfigured` segue consumido por `leads/page.tsx:61` e `dashboard/page.tsx:229`.
- [ ] `tenant.test.ts` cobre `requireTenantContext` (resolve não-null e lança) e mantém os casos de `getOptionalTenantContext`.
- [ ] Reasserções redundantes do throw removidas de `leads.test.ts`, `notes.test.ts`, `templates.test.ts`; testes de shape vazio mantidos.
- [ ] `pnpm test` (ou `npm test`) e `tsc --noEmit` passam; build do Next.js sem erros de tipo.
- [ ] Alias deprecado `getTenantContext` removido ao final (nenhum import remanescente).

## Ordem de execução

1. Adicionar em `src/lib/tenant.ts`: `NO_TENANT_DB_MESSAGE`, `NoTenantDatabaseError`, renomear corpo atual para `getOptionalTenantContext`, criar `requireTenantContext`, manter alias deprecado `getTenantContext = getOptionalTenantContext`.
2. Atualizar `src/lib/tenant.test.ts` (resolver-level): novos casos de `requireTenantContext`; manter casos de `getOptionalTenantContext`.
3. Migrar Grupo A arquivo por arquivo (`leads.ts` → `campaigns.ts` → `contacts.ts` → `notifications.ts` → `templates.ts` → `notes.ts` → `message-history.ts`), deletando guards e usando `requireTenantContext()`.
4. Migrar Grupo B para `getOptionalTenantContext()` (mesmos arquivos + `chat.ts`), mantendo cada shape vazio.
5. Limpar testes de action: remover reasserções de throw, reapontar mocks (`requireTenantContext` / `getOptionalTenantContext`), manter testes de shape vazio.
6. Rodar `grep` de aceite (`if (!context)` = 16; string mágica = 0), `tsc --noEmit`, suíte de testes e build.
7. Remover o alias deprecado `getTenantContext` e qualquer import remanescente.

## Nota de verificação

A verificação adversarial **confirmou** o ponto, mas **revisou a severidade de Alta para Média**: não há bug ao vivo (todos os 39 sites têm guard), o ganho é estrutural — consolidação da duplicação do Grupo A e tipagem de intenção. A magnitude foi precisada: dos 39 guards, **23 são duplicação byte-a-byte** do `throw` (confirmados por `grep`: 23 em código de produção, 28 contando testes e UI), e **16 são shapes de estado-vazio específicos do chamador que NÃO devem ser unificados** — colapsá-los num fallback único inverteria a dependência e tornaria a costura mais rasa, o que seria refator prematuro. O sentinel `noDatabaseConfigured: true` é genuinamente consumido pela UI (`leads/page.tsx:61`, `dashboard/page.tsx:229`) e deve ser preservado. A mensagem honesta do impacto de testes é **"23 consolidam + 16 ganham contrato mais claro"**, e não "39 guards somem".
