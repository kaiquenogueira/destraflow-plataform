# Sprint 08 — Limpeza de lint (ratchet de `warn` → `error`)

> - **Prioridade:** Baixa (dívida técnica / endurecimento de guardrail)
> - **Complexidade:** Baixa–Média (mecânico, mas amplo)
> - **Esforço estimado:** 2–3 dias
> - **Dependências:** Nenhuma. Coordenar com Sprints 01/04/06 (refatoram os arquivos que hoje disparam os *warns estruturais*).
> - **Subsistemas:** Configuração de lint, componentes/pages client, actions, scripts
> - **Status:** Concluído (2026-06-22) — 5 regras subidas para `error` (`no-floating-promises`, `no-explicit-any` no código, `no-unused-vars`, `react/no-unescaped-entities`, `react-hooks/error-boundaries`). Lint **0 errors / 50 warnings** (46 estruturais do Ponto 5 + 4 de regras do preset fora de escopo). `any` = `off` em testes. Ver "Nota de fechamento" abaixo.

## Resumo executivo

Quando os guardrails foram ligados (ver [docs/HARNESS-ENGINEERING.md](../../HARNESS-ENGINEERING.md)), o lint estava **vermelho** (742 erros; ~1533 problemas vinham de `src/generated`, agora ignorado). Para tornar o gate **funcional e verde**, várias regras pré-existentes foram **rebaixadas para `warn`** em `eslint.config.mjs`, com a dívida rastreada. Este sprint **quita essa dívida em fases** e sobe cada regra de volta para `error`, deixando o lint estrito de verdade.

Estado atual: **0 errors / 200 warnings**. Distribuição dos warnings:

| Regra | Qtd | Onde |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` | 99 | ~88 em arquivos de teste (mocks), ~11 em código não-teste |
| `@typescript-eslint/no-unused-vars` | 40 | espalhado |
| `@typescript-eslint/no-floating-promises` | 7 | 3 client components/pages |
| `react-hooks/error-boundaries` | 5 | `campaigns/[id]/page.tsx` |
| `react/no-unescaped-entities` | 2 | componentes |
| Estruturais (`complexity`, `max-lines*`, `max-params`) | restante | `worker.ts`, `campaign-personalizer.ts`, `campaign-form.tsx`, testes |

> **Estratégia inegociável: fix-then-flip por regra.** Para cada regra: corrigir TODAS as violações → mudar a regra para `error` em `eslint.config.mjs` → `npm run lint` verde → commit. Assim o gate nunca fica vermelho entre passos, e cada PR é pequeno e revisável.

## Pontos abordados

1. `no-floating-promises` (7) — corrigir e subir para `error`. **Maior valor** (são promises não-aguardadas reais).
2. `no-explicit-any` (99) — corrigir os ~11 de código; subir para `error` no código, manter `warn`/allow em testes.
3. `no-unused-vars` (40) — corrigir e subir para `error`.
4. `react-hooks/error-boundaries` (5) + `react/no-unescaped-entities` (2) — corrigir e subir para `error`.
5. Warns **estruturais** — manter `warn`; ratchetar limites só após os Sprints 01/04/06.

---

### Ponto 1 — `no-floating-promises` (7 sites) → `error`

**Problema**

A regra (type-aware) foi adicionada em `eslint.config.mjs` mas rebaixada para `warn` por ter 7 violações reais: funções `async` chamadas dentro de `useEffect` ou de handlers síncronos **sem `await` nem `void`**, descartando a promise (e qualquer rejeição não tratada na borda).

Os 7 sites (todos client components/pages; cada `async` chamada **já trata erros internamente** via `try/catch` + `toast`, então a correção idiomática é marcar a chamada como fire-and-forget explícito com `void`):

| # | Arquivo:linha | Contexto | Correção |
| --- | --- | --- | --- |
| 1 | `src/components/leads/lead-notes.tsx:42` | `useEffect(() => { fetchNotes(); }, ...)` | `void fetchNotes();` |
| 2 | `src/components/leads/lead-notes.tsx:76` | `handleKeyDown` (sync) → `handleCreate()` | `void handleCreate();` |
| 3 | `src/components/campaigns/campaign-form.tsx:115` | `useEffect(() => { loadTemplates(); }, [])` | `void loadTemplates();` |
| 4 | `src/components/campaigns/campaign-form.tsx:121` | `useEffect(() => { if (...) fetchLeads(); }, ...)` | `void fetchLeads();` |
| 5 | `src/app/(dashboard)/whatsapp/page.tsx:49` | `useEffect(() => { fetchStatus(); }, ...)` | `void fetchStatus();` |
| 6 | `src/app/(dashboard)/whatsapp/page.tsx:88` | `useEffect(() => { ... handleGenerateQR(); }, ...)` | `void handleGenerateQR();` |
| 7 | `src/app/(dashboard)/whatsapp/page.tsx:123` | `handleSaveConfig` → `fetchStatus()` | `void fetchStatus();` |

**Causa raiz**

Padrão React comum: disparar trabalho assíncrono de um efeito/handler. Sem `void`/`await`, o linter (corretamente) não consegue garantir que a rejeição foi tratada. Aqui o tratamento existe dentro de cada função, mas a intenção (fire-and-forget) não está **explícita** na chamada.

**Impacto**

Latente. Hoje os erros são engolidos pelos `try/catch` internos, então não há bug visível. Mas a regra protege caminhos futuros: o worker, campanhas e envio Evolution são exatamente onde uma promise não-aguardada esconderia falha. Manter a regra como `error` impede regressões nesses caminhos.

**Solução técnica detalhada**

1. Aplicar `void` nos 7 sites conforme a tabela. Exemplo (`lead-notes.tsx`):
   ```ts
   // antes
   useEffect(() => { fetchNotes(); }, [fetchNotes]);
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { handleCreate(); }
   };
   // depois
   useEffect(() => { void fetchNotes(); }, [fetchNotes]);
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { void handleCreate(); }
   };
   ```
2. Em `eslint.config.mjs`, no bloco type-aware (`files: ["src/**/*.{ts,tsx}"]`), mudar:
   ```diff
   - "@typescript-eslint/no-floating-promises": "warn",
   + "@typescript-eslint/no-floating-promises": "error",
   ```
3. `npm run lint` → 0 errors. Commit.

**Arquivos afetados**

| Arquivo | Ação |
| --- | --- |
| `src/components/leads/lead-notes.tsx` | Editar (2 `void`) |
| `src/components/campaigns/campaign-form.tsx` | Editar (2 `void`) |
| `src/app/(dashboard)/whatsapp/page.tsx` | Editar (3 `void`) |
| `eslint.config.mjs` | `no-floating-promises` → `error` |

**Plano de testes**

- `npm run lint` verde com a regra em `error`.
- Smoke manual: notas do lead carregam/criam; form de campanha carrega templates/leads; página WhatsApp gera QR/salva config — comportamento idêntico (o `void` não muda runtime).

**Critérios de aceite**

- [ ] 7 chamadas marcadas com `void`.
- [ ] `no-floating-promises` em `error`; `npm run lint` 0 errors.

---

### Ponto 2 — `no-explicit-any` (99) → `error` no código, `warn`/allow em testes

**Problema**

99 `any`, mas a distribuição importa: **~88 estão em arquivos de teste** (mocks de Prisma/sessão) e só **~11 em código de produção**:

| Arquivo (não-teste) | Qtd |
| --- | --- |
| `scripts/migrate-tenants.ts` | 3 |
| `src/actions/notes.ts` | 3 |
| `src/actions/campaigns.ts` | 2 |
| `src/actions/templates.ts` | 1 |
| `src/actions/tenant-sync.ts` | 1 |
| `src/app/(dashboard)/dashboard/page.tsx` | 1 |

Os ~88 restantes estão em `admin.test.ts` (33), `auth.test.ts` (18), `tenant-sync.test.ts` (13), `whatsapp.test.ts` (7), `tenant.test.ts` (5), `leads.test.ts` (4), `campaigns.test.ts` (3), `notes.test.ts` (3), `templates.test.ts` (2).

**Causa raiz**

`any` em mocks de teste é comum e de baixo risco; `any` em código de produção esconde tipos reais (ex.: o `.map((lead: any) => ...)` em `campaigns.ts`).

**Solução técnica detalhada**

1. **Corrigir os ~11 de código** tipando corretamente. Padrões:
   - `data.map((t: any) => ...)` → derivar o tipo do retorno do Prisma/da action (`Awaited<ReturnType<typeof getTemplates>>[number]`), ou um tipo nomeado local.
   - Retornos de `groupBy`/`reduce` em `campaigns.ts`/`notes.ts` → tipar o acumulador.
2. **Decisão sobre testes:** tipar 88 mocks é alto custo/baixo valor. Recomendado: manter `any` **permitido em testes** via override explícito, e subir a `error` só no código:
   ```js
   // bloco de produção (subir a error)
   {
     files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
     ignores: ["**/*.test.{ts,tsx}"],
     rules: { "@typescript-eslint/no-explicit-any": "error" },
   },
   // testes: any tolerado (mocks)
   {
     files: ["**/*.test.{ts,tsx}"],
     rules: { "@typescript-eslint/no-explicit-any": "off" },
   },
   ```
   Remover, então, `no-explicit-any` do bloco de dívida geral.
3. `npm run lint` verde. Commit.

**Arquivos afetados**

| Arquivo | Ação |
| --- | --- |
| `scripts/migrate-tenants.ts`, `src/actions/{notes,campaigns,templates,tenant-sync}.ts`, `src/app/(dashboard)/dashboard/page.tsx` | Editar (tipar ~11 `any`) |
| `eslint.config.mjs` | `no-explicit-any`: `error` no código, `off` em testes |

**Plano de testes**

- `npm run lint` 0 errors. `npm run typecheck` verde (os tipos novos devem compilar).
- Suíte verde (tipar código de produção não muda runtime).

**Critérios de aceite**

- [ ] ~11 `any` de código tipados; nenhum `any` novo fora de teste.
- [ ] `no-explicit-any` = `error` no código, `off` em `*.test.*`; lint 0 errors.

---

### Ponto 3 — `no-unused-vars` (40) → `error`

**Problema**

40 variáveis/imports declarados e não usados (ex.: `crypto` em `migrate-tenants.ts:4`, `stderr` em `migrate-tenants.ts:63`, `connectionString` em `tenant-sync-utils.ts:19`, `e` em `check_instance.ts:11`, etc.).

**Solução técnica detalhada**

1. Para cada warning: **remover** o símbolo não usado; se for um parâmetro necessário por posição, prefixar com `_` (a convenção `argsIgnorePattern: "^_"` do preset já ignora). Onde fizer sentido, configurar explicitamente:
   ```js
   "@typescript-eslint/no-unused-vars": ["error", {
     argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_",
   }],
   ```
   Isso permite `catch (_e)` e parâmetros posicionais sem ruído.
2. Subir a regra para `error` (remover do bloco de dívida). `npm run lint` verde. Commit.

**Arquivos afetados:** os ~40 sites (maioria scripts e utils) + `eslint.config.mjs`.

**Critérios de aceite**

- [ ] 0 `no-unused-vars`; regra em `error` com `^_` ignore.

---

### Ponto 4 — `react-hooks/error-boundaries` (5) + `react/no-unescaped-entities` (2) → `error`

**Problema**

- `error-boundaries` (5): em `src/app/(dashboard)/campaigns/[id]/page.tsx` há `try/catch` ao redor de render de componentes — o React não captura erros de render assim (precisa de Error Boundary). O `catch` chama `notFound()`, então pode ser intencional para o caso "não encontrado", mas a regra alerta o padrão.
- `no-unescaped-entities` (2): aspas/apóstrofos crus em JSX.

**Solução técnica detalhada**

1. `no-unescaped-entities` (2): trocar `'`/`"` crus por entidades (`&apos;`/`&quot;`) ou mover o texto para fora do JSX. Trivial; subir a `error`.
2. `error-boundaries` (5): avaliar `campaigns/[id]/page.tsx`. Se o `try/catch` serve só para `notFound()` em dados ausentes, mover a checagem para **antes** do render (buscar dados, `if (!data) notFound()`), deixando o JSX fora do `try`. Depois subir a `error`. Se houver caso legítimo, usar `// eslint-disable-next-line` **com justificativa**.

**Arquivos afetados:** `campaigns/[id]/page.tsx` + 2 componentes com entidades + `eslint.config.mjs`.

**Critérios de aceite**

- [ ] `no-unescaped-entities` e `error-boundaries` em `error`; lint 0 errors (ou disables justificados pontuais).

---

### Ponto 5 — Warns estruturais: **manter `warn` por enquanto**

`complexity`, `max-lines`, `max-lines-per-function`, `max-params` disparam em `worker.ts` (`processTenantMessages`: 139 linhas, 7 params), `campaign-personalizer.ts` (`personalize`: complexity 17), `campaign-form.tsx`, e testes longos.

**Decisão:** **não** corrigir agora nem subir a `error`. Esses arquivos são exatamente os refatorados pelos **Sprint 01** (quota/worker), **Sprint 04** (máquina de estados) e **Sprint 06** (intake). Após esses sprints, `processTenantMessages` encolhe (param object + transição pura extraída) e `personalize` simplifica. **Revisitar** os limites estruturais e subir a `error` **depois** — registrar como follow-up. Subir agora forçaria refator prematuro ou disables espalhados.

**Critério:** decisão registrada (este ponto); nenhuma ação de código neste sprint.

---

## Ordem de execução

1. **Ponto 1** (floating-promises) — maior valor, menor esforço; PR isolado.
2. **Ponto 3** (`no-unused-vars`) — mecânico.
3. **Ponto 4** (entities + error-boundaries) — pequeno.
4. **Ponto 2** (`any`) — maior; tipar os 11 de código + override de testes.
5. **Ponto 5** — só registro; revisitar após Sprints 01/04/06.

A cada ponto: corrigir → flip da regra em `eslint.config.mjs` → `npm run lint` 0 errors → `npm run typecheck` → commit. O CI (`lint` + `typecheck`) permanece verde a cada passo.

## Nota de fechamento (2026-06-22)

Executado em uma branch única (`chore/sprint-08-lint-ratchet`), com as correções aplicadas site-a-site antes de subir cada regra a `error` no `eslint.config.mjs`. Estado final: `lint` 0 errors, `typecheck` verde, 239 testes verdes, `build` ok.

- **P1 (floating-promises, 7 sites):** `void` em `lead-notes.tsx` (2), `campaign-form.tsx` (2), `whatsapp/page.tsx` (3). Regra → `error`.
- **P2 (no-explicit-any):** 11 sites de código tipados (de `migrate-tenants.ts`, `campaigns.ts`, `notes.ts`, `templates.ts`, `tenant-sync.ts`, `dashboard/page.tsx`). Regra → `error` no código, `off` em `*.test.*`. Além dos 11 reportados, removidos 3 `eslint-disable` de `any` em código (`campaign-form.tsx`, `campaigns.ts`, `proxy.ts`) tipando corretamente, e 2 `eslint-disable` redundantes em testes.
  - **Resíduo deliberado:** 2 `eslint-disable no-explicit-any` permanecem nos *builders* dinâmicos de `where` Prisma (`actions/notes.ts:where`, `actions/leads.ts:where`). Re-tipar com `Prisma.XWhereInput` esbarra no spread de união (`...where.criadoEm`) e exigiria refactor do bloco — fora do escopo dos 11 enumerados. Documentado como dívida pequena.
- **P3 (no-unused-vars, 36):** imports/vars/funções mortas removidas; bindings de `catch` não usados → optional catch binding (`catch {`); param posicional `connectionString` → `_connectionString`. Regra → `error` com `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern: "^_"`.
- **P4 (entities + error-boundaries):** 2 entidades escapadas em `lead-details-modal.tsx`; `campaigns/[id]/page.tsx` reestruturado (fetch antes do render, JSX fora do `try/catch`, `notFound()` no `catch`). Ambas as regras → `error`.
- **P5 (estruturais):** mantidas em `warn`. Reverificado: mesmo após Sprints 01/04/06, `worker.ts` (`processTenantMessages`: 114 linhas, 6 params) e `campaign-personalizer.ts` (`personalize`: complexity 17) **ainda excedem** os limites. Subir a `error` agora forçaria refactor adicional não planejado — **follow-up futuro**, não este sprint.

## Nota de verificação

Dados extraídos de `npx eslint --format json` em 2026-06-20 (HEAD `faec8e3`): 7 `no-floating-promises`, 99 `no-explicit-any` (88 em testes), 40 `no-unused-vars`, 5 `error-boundaries`, 2 `no-unescaped-entities`. Os 7 sites de floating-promise foram lidos individualmente: todos têm tratamento de erro interno (`try/catch` + `toast`), confirmando que `void` é a correção correta (fire-and-forget explícito), não `await`. A concentração de `any` em testes (mocks) justifica o `off` em `*.test.*` em vez de tipagem cara de mocks. Os warns estruturais são deixados para depois dos Sprints 01/04/06 **de propósito** — subir a `error` agora colidiria com refatorações já planejadas que os eliminam naturalmente.
