# Engenharia de Harness e Governança do Repositório — DestraFlow

> Guia único e canônico para manter o `destraflow-plataform` navegável por agentes de IA (Claude Code) e crescer de forma organizada. É documentação **viva**: quando o agente erra a mesma coisa duas vezes, a correção vira regra/gate aqui ou no harness — não um aviso no chat.
>
> Stack: Next.js 16 (App Router) + Prisma 7 (banco CRM central + 1 banco por tenant) + NextAuth + Upstash + Vitest + Shadcn/UI. Integrações: Evolution API (WhatsApp) e N8N (dono dos eventos de mensagem; **o DB é a fonte da verdade**).

---

## 1. O que é harness engineering (e por que importa aqui)

**Agente = Modelo + Harness.** O modelo é fixo e probabilístico; a confiabilidade vem de tudo que cerca o modelo — entrega de contexto, interfaces de tools, artefatos de planejamento, loops de verificação, memória e sandbox. **Harness engineering** é a disciplina de projetar esse andaime como produto de engenharia versionado.

A diferença em relação a **prompt engineering** é a fonte da conformidade:

| | Prompt engineering | Harness engineering |
| --- | --- | --- |
| Escopo | Uma requisição | Infraestrutura persistente entre turnos/sessões |
| Conformidade | **Probabilística** ("siga os padrões") | **Determinística** ("um linter bloqueia o PR quando o padrão é violado") |
| Artefato | Texto do prompt | CI, hooks, rules files, type system, ADRs, skills |

O harness opera em três camadas que se reforçam ([Augment Code](https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents), [Martin Fowler](https://martinfowler.com/articles/harness-engineering.html)):

1. **Constraints (feedforward, antes da geração):** rules files, ESLint em nível `error`, type system, `init.sh`. Aumentam a chance de acerto na primeira tentativa.
2. **Feedback loops (sensores):** `tsc`, Vitest, lint, AI review. A mensagem do sensor deve **prescrever a correção**, não só sinalizar a violação.
3. **Quality gates (enforcement, no merge):** CI obrigatório + branch ruleset que impede merge de código não-conforme.

Por que isso importa no DestraFlow: o agente gera código mais rápido do que você revisa, é multi-tenant tocando PII (leads, números de WhatsApp) e credenciais (`DATA_ENCRYPTION_KEY`, Evolution API). Regras em prosa não bastam — o agente otimiza para "fazer o commit passar", não para a intenção da política. **Toda regra que importa precisa ser mecanicamente forçada.**

> Fontes primárias: [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [Effective harnesses for long-running agents — Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) · [Harness engineering — Martin Fowler](https://martinfowler.com/articles/harness-engineering.html)

---

## 2. Princípios

### 2.1 Engenharia de contexto: o menor conjunto de tokens de alto sinal
A janela de contexto é o recurso mais escasso; mais tokens **pioram** (context rot, alucinações). Cure, não acumule. Use *just-in-time*: entregue identificadores leves (caminhos, queries) e deixe o agente carregar sob demanda.

**Como aplicamos:** `CLAUDE.md` enxuto (alvo <200 linhas) com a topologia exata — dois domínios Prisma (`schema.crm.prisma` central vs `schema.tenant.prisma` por tenant), uso obrigatório de `src/lib/tenant.ts`, padrão de Server Actions, comando de teste. **Não** despejar schemas inteiros no contexto: referenciar `@PROJECT_STRUCTURE.md` e `@docs/ARCHITECTURE.md` por caminho.

### 2.2 Scaffolding determinístico > instrução probabilística
"Siga os padrões" depende do modelo; um gate de CI remove a variabilidade da equação de qualidade.

**Como aplicamos:** subir o ESLint de default-Next para regras em nível `error` (complexidade, `no-floating-promises`), trocar `test: vitest` (modo watch, pode travar o CI) por `vitest run`, e adicionar `tsc --noEmit` + `next build` + `prisma validate` como steps obrigatórios.

### 2.3 Guardrails: feedforward + feedback como governador cibernético
Guias (AGENTS/CLAUDE.md, linters, LSP, `init.sh`) aumentam o acerto inicial; sensores (type checker, testes, AI review) detectam o desvio. A chave: o sensor **prescreve o fix**.

**Como aplicamos:** sensor de tenancy cuja mensagem de erro diz `use o client escopado de src/lib/tenant.ts`, não apenas "query insegura". Checks leves no pre-commit; caros (review, e2e WhatsApp) pós-integração.

### 2.4 Verificação end-to-end, não declaração prematura de vitória
Agentes declaram "completo" assim que unit tests passam. Verifique como um humano usaria (browser automation via MCP Playwright) e use listas de aceitação em JSON marcadas `failing` (JSON porque o modelo evita sobrescrevê-lo indevidamente, ao contrário de Markdown).

**Como aplicamos:** para import de leads (CSV/XLSX) e retry de dead-letter de campanhas, manter aceitação em JSON e validar o fluxo real no navegador. **Regra inegociável: é inaceitável remover/editar testes para fazer a suíte passar.**

### 2.5 Módulos profundos (Ousterhout): interface pequena, complexidade escondida
Um módulo profundo oferece funcionalidade poderosa atrás de interface simples. Para o agente, isso reduz quantos arquivos ele precisa ler: ele chama uma função e confia na fronteira. Módulos rasos (interface grande, pouca lógica) vazam complexidade e poluem o contexto.

**Como aplicamos:** `src/lib/worker.ts` (fila + retry com backoff + DEAD_LETTER + envio) e `src/lib/tenant.ts` já são bons candidatos. Exponha `sendCampaignMessage(message)` e o resolver de tenant; esconda Prisma multi-schema, Evolution API e a máquina de estados de retry. Em `src/actions/campaigns.ts`, mantenha a Server Action **fina** (Zod + auth + chamar serviço) e a lógica profunda em `lib/`.

### 2.6 Loops com estado durável entre sessões
Tarefas longas estouram a janela. Dê memória externa: structured note-taking, compaction (resumir preservando decisões de arquitetura e bugs em aberto) e um arquivo de progresso + git.

**Como aplicamos:** `docs/sprint/` já cumpre parte disso. Loop de startup por sessão: `pwd` → ler `git log` + sprint atual → escolher **uma** feature → rodar smoke test → corrigir bugs antigos antes de novas features → commit descritivo.

> Fontes: [Anthropic — context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [Anthropic — long-running harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) · [A Philosophy of Software Design (Ousterhout, PDF)](https://milkov.tech/assets/psd.pdf) · [Feature-Sliced Design para App Router](https://feature-sliced.design/blog/nextjs-app-router-guide)

---

## 3. Camada de contexto para agentes

O repo carrega um mapa legível por máquina. Cada artefato tem um papel; conteúdo redundante entre eles gera drift e desperdiça contexto.

| Artefato | Papel | O que vai dentro | Estado atual |
| --- | --- | --- | --- |
| **`CLAUDE.md`** (raiz) | Lido em **toda** sessão pelo Claude Code | Só o que o agente **não infere** lendo código: comandos, gotchas, regras "sempre faça X", mapa de features, ponteiros `@` | **Criar** (ausente) |
| **`CONTEXT.md`** (raiz) | Linguagem de domínio canônica; alimenta a skill `improve-codebase-architecture` | Glossário de domínio (tenant, campanha, message lifecycle), invariantes | **Existe** — manter vivo |
| **`docs/adr/`** | Decisões arquiteturais imutáveis (ver §3.3) | Uma decisão por ADR, MADR, status no front-matter | **Existe** (0000–0005) |
| **`docs/sprint/`** | Memória durável de trabalho entre sessões | Decisões da sprint, bugs em aberto, próximos passos | **Existe** (01–07) |
| **`PROJECT_STRUCTURE.md`** | Topologia de pastas | Árvore + responsabilidade de cada diretório | **Existe** |
| **`docs/ARCHITECTURE.md`** | Visão arquitetural detalhada | Fluxos, integrações, decisões de runtime | **Existe** |
| **`.claude/rules/*.md`** (opcional) | Regras path-scoped, carregadas só ao tocar globs | Convenções específicas de `prisma/**`, `**/*.test.ts`, `src/actions/**` | Avaliar |

### 3.1 O `CLAUDE.md` (a criar — maior alavancagem imediata)
Mantenha enxuto (<200 linhas; LLMs seguem com confiança ~150–200 instruções antes de degradar). Para cada linha, pergunte: *"remover isto faria a IA errar?"*. Conteúdo mínimo sugerido:

- **Comandos:** `npm test` = `vitest` (gate usa `vitest run`); `npm run db:split` **antes** de `db:generate`; `db:push:crm`; `npm run lint`; `npm run build`; dev usa `next dev --webpack`.
- **Regra N8N:** não criar `/api/webhook/*` de mensageria — N8N é dono dos eventos; **o DB é a fonte da verdade** (ver `docs/adr/0002`).
- **Regra multi-tenant:** toda query de dados de tenant passa por `src/lib/tenant.ts` com `tenantId`/`organizationId` derivado da sessão NextAuth; nunca confiar em id do client (ver `docs/adr/0003`).
- **Regra de testes:** nunca editar/remover testes para a suíte passar; rodar os testes da feature tocada + typecheck antes de concluir.
- **Mapa de features** e ponteiros: `@PROJECT_STRUCTURE.md`, `@docs/ARCHITECTURE.md`, "leia `docs/adr/` antes de propor mudanças em multi-tenancy, fila de campanhas e schema Prisma; não re-proponha o que estiver em `status: rejected`".

Como o Claude Code lê `CLAUDE.md` e **não** lê `AGENTS.md`, se o time também usar Codex/Copilot/Cursor, crie `AGENTS.md` como fonte única e um `CLAUDE.md` que comece com `@AGENTS.md`. Use `<!-- comentário -->` para notas de manutenção (o Claude Code os remove do contexto). Preferências pessoais ficam em `CLAUDE.local.md` (gitignored).

### 3.2 Manter vivo (atualização reativa)
Regra de equipe: **explicou 2x → vira regra.** Em PRs, revise se algum artefato ficou desatualizado (ex.: um comando `db:*` mudou). Nunca delegue ao LLM o trabalho do linter ("never send an LLM to do a linter's job") nem coloque segredos/PII nesses arquivos — eles são versionados.

### 3.3 ADRs como prática viva
Já existe `docs/adr/` com template MADR e decisões registradas, incluindo a **rejeitada** `0005-rejected-premature-seams.md`. Regras:

- **Imutabilidade:** nunca reescreva uma decisão aceita. Ao mudar o contexto, crie um novo ADR e edite **apenas** o `status` do antigo para `superseded by ADR-XXXX`, com link recíproco.
- **Registre rejeições:** decisões rejeitadas (status `rejected`, ou alternativas com `Bad, because...` na seção "Pros and Cons") impedem que um agente sem memória re-litigue escolhas já avaliadas (ex.: envio síncrono de WhatsApp que estoura rate-limit).
- **No momento da decisão, dentro do PR:** o PR que introduz a mudança inclui o ADR em `status: proposed`; aprovação do PR = aceitação.
- **Gatilho:** difícil de reverter, afeta múltiplos módulos, trade-off significativo, OU já debatido >1 vez. SIM para isolamento multi-tenant, broker/fila, retry/dead-letter, rate-limit por número. NÃO para nome de variável ou CRUD trivial.
- **Aponte o código para o ADR** em cada costura: `// retry+DLQ: ver docs/adr/0004` no worker. ADRs não citados pelo código são invisíveis quando mais importam.

> Fontes: [Claude Code memory](https://code.claude.com/docs/en/memory) · [AGENTS.md](https://agents.md/) · [HumanLayer — writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) · [MADR](https://adr.github.io/madr/) · [AWS — ADR best practices](https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/) · [Codified Context (arXiv)](https://arxiv.org/html/2602.20478v1)

---

## 4. Convenções de código para crescimento organizado

### 4.1 Estrutura de pastas (estado atual + direção)
Hoje o repo é organizado por **camada técnica**: `src/actions`, `src/components`, `src/lib`, `src/services`, `src/app`. Funciona enquanto pequeno, mas espalha cada feature por várias pastas distantes, forçando o agente a ler muitos arquivos para entender uma feature.

**Responsabilidades atuais (manter limpas):**
- `src/actions/` — Server Actions (`"use server"`): interface fina = validação Zod + auth + delegar a `lib`/`services`.
- `src/lib/` — lógica profunda server-side: `tenant.ts` (resolver de tenant — fronteira crítica), `worker.ts` (fila/retry/DLQ), `encryption.ts`, `prisma.ts`, `redis.ts`, `evolution.ts`.
- `src/services/` — domínios complexos (ex.: `ai/`).
- `src/components/` — UI (Client Components folha); **não** importam `actions` diretamente além do necessário.
- `src/app/` — roteamento fino que **delega** às features.

**Direção (quando a dor de coesão aparecer):** migrar para *feature/vertical slices* `src/features/{campaigns,leads,templates,whatsapp,...}/` com `ui/ model/ actions/ lib/` e testes colocados, mantendo `src/app/` como composição fina e `src/shared/` para código agnóstico (prisma, encryption, redis, ui shadcn). **Não migre tudo de uma vez** — registre um ADR e mova um domínio por vez.

### 4.2 Colocação de testes
Já é o padrão e deve ser mantido: `*.test.ts` **ao lado** da fonte (`campaigns.ts` + `campaigns.test.ts`, `worker.ts` + `worker.test.ts`). Torna óbvio o que verificar e onde adicionar cobertura. Faça o agente rodar o teste relacionado ao arquivo, não a suíte toda.

### 4.3 Nomenclatura
kebab-case para arquivos (já usado: `campaign-form.tsx`). Sufixos previsíveis dentro de cada domínio (`*.test.ts`; ao adotar slices, `*.action.ts`, `*.queries.ts`, `*.schema.ts`) para localizar por glob sem ler conteúdo.

### 4.4 Limites de tamanho e responsabilidade
Arquivos grandes que misturam UI + validação + side effects são **módulos rasos**. Imponha `max-lines` no ESLint (ex.: 300, `warn`) e refatore os ofensores (ex.: formulários de campanha, importadores de lead, `campaigns.ts`, `worker.ts`): extraia parsing CSV/XLSX e dedup para `lib/`, schema Zod para `model/`, mantendo action/componente como interface fina.

### 4.5 Quando criar um módulo profundo vs. NÃO criar costura (regra do 1-adaptador)
Crie uma costura (interface que esconde implementação) quando há **complexidade real a esconder** atrás dela: `worker.ts`, resolver de tenant, cliente Evolution. **Não** crie abstração antecipada para uma única implementação trivial — é exatamente o que `docs/adr/0005-rejected-premature-seams.md` rejeita. Regra prática (1-adaptador): só introduza a camada de abstração quando existir (ou for iminente) **mais de uma** implementação concreta; com um único adaptador, prefira chamada direta.

### 4.6 Fronteiras de domínio
- **Tenant DB vs CRM DB:** a fronteira mais crítica. **Toda** query de dados de tenant passa por `src/lib/tenant.ts`; **nunca** importar o client global em código de feature. Reads na entidade, mutations na action.
- **N8N/Evolution:** sem webhooks de mensageria no app; o DB é a fonte da verdade (`docs/adr/0002`, `0004`). Esconda a Evolution API atrás de uma interface em `lib/evolution.ts`.
- **Sem cross-import entre features** (quando adotar slices): camadas baixas não importam altas; composição vive em `app/`. Imponha via `no-restricted-imports`/`eslint-plugin-boundaries`.

### 4.7 Barrels
Evite `index.ts` re-exportando módulos em código de app — trava tree-shaking e infla startup (casos reais ~68% mais módulos). `src/types/index.ts` para tipos puros é tolerável. Se precisar de barrel em lib interna, configure `optimizePackageImports` no `next.config.ts`.

> Fontes: [Ousterhout — APoSD](https://milkov.tech/assets/psd.pdf) · [Feature-Sliced Design](https://feature-sliced.design/blog/nextjs-app-router-guide) · [Vertical feature slicing](https://medium.com/@farzaneh.haddadi/how-to-organize-a-growing-next-js-app-a-practical-guide-to-vertical-feature-slicing-5b2970babb53) · [TkDodo — stop using barrel files](https://tkdodo.eu/blog/please-stop-using-barrel-files)

---

## 5. Guardrails de qualidade (checklist + como ligar)

> **✅ Implementado em 2026-06-20:** CI agora roda `lint + typecheck + build + test:coverage` + job `Secret Scan` (gitleaks). Pre-commit via husky (`lint-staged` + gitleaks se instalado) e commit-msg via commitlint (Conventional Commits). Coverage com thresholds-ratchet no `vitest.config.ts`. ESLint endurecido (warns estruturais + `no-floating-promises` type-aware). `dependabot.yml`, `CODEOWNERS`, `.gitleaks.toml` criados.
> **Pendências manuais:** (1) confirmar o handle em `.github/CODEOWNERS`; (2) criar o **branch ruleset** em `main` (passo de UI do GitHub, abaixo); (3) instalar o binário `gitleaks` localmente para o pre-commit; (4) ratchetar a dívida de lint de `warn`→`error` (99 `any`, **7 floating-promises reais**) — ver `eslint.config.mjs`.

Defesa em camadas: **hook local rápido** (feedback em segundos, pode ser pulado com `--no-verify`) **+ CI autoritativo** (única barreira incontornável) **+ ruleset** que torna o CI obrigatório no merge.

Estado atual e lacunas:

| Guardrail | Estado | Ação |
| --- | --- | --- |
| `.env*` no `.gitignore` | OK | Manter; nunca versionar |
| CI (`.github/workflows/ci.yml`) roda lint + test | OK parcial | Adicionar typecheck + build + coverage; trocar `vitest` por `vitest run` |
| `tsc --noEmit` no CI | **Falta** | Adicionar script `typecheck` + step |
| `next build` no CI | **Falta** | Adicionar step (pega erros de Server Component/route) |
| Coverage threshold no Vitest | **Falta** | Configurar (`@vitest/coverage-v8` já instalado) |
| ESLint em nível `error` (complexidade, `no-floating-promises`) | **Falta** | Endurecer `eslint.config.mjs` |
| gitleaks (pre-commit + CI) | **Falta** | Prioridade nº 1 (§6) |
| husky + lint-staged | **Falta** | Instalar |
| commitlint (Conventional Commits) | **Falta** | Instalar |
| Branch protection / ruleset em `main` | Provável falta | Criar ruleset (PR + status checks obrigatórios) |
| CODEOWNERS | **Falta** | Criar |
| Dependabot/Renovate | **Falta** | Criar `dependabot.yml` |
| Prettier | **Falta** | Adicionar (repo só tem ESLint) |

**`no-floating-promises`** é crítico aqui: campanhas async, worker e envio Evolution são caminhos onde uma promise não-aguardada engole erros silenciosamente.

**Ruleset em `main`** (Settings > Rules > Rulesets; comece em *Evaluate*, depois *Active*, com "do not allow bypassing"): require PR, 1 aprovação, dismiss stale approvals, require review from Code Owners, require status checks (job `Build and Test` + gitleaks — nomes de job únicos), block force pushes, require linear history.

> Fontes: [Augment Code — harness engineering](https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents) · [GitHub branch rulesets 2025](https://www.xeradi.dev/blog/github-branch-rulesets-guide) · [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

---

## 6. Higiene e sanitização

- **Secret hygiene (maior valor, menor custo):** vazar `DATA_ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `EVOLUTION_API_KEY` ou `CRON_SECRET` é irreversível e expõe **todos** os tenants. `.env*` já ignorado — manter. Adicionar **gitleaks** no pre-commit (`--staged`, ~1–3s) e no CI (`fetch-depth: 0` para varrer histórico em PRs). Se algo vazou: **rotacione a chave imediatamente** e considere reescrita de histórico — apagar o commit não basta.
- **Dependências:** Dependabot semanal (npm + github-actions), agrupando minor/patch para reduzir ruído; ativar Dependabot security updates.
- **Dados de tenant/PII:** leads e números de WhatsApp são PII. Nunca em fixtures versionadas, logs ou arquivos de contexto. Acesso sempre escopado por tenant (§4.6).
- **Logs sem segredos:** nunca logar credenciais decriptadas, tokens da Evolution ou conteúdo de `.env`. Em mensagens de erro de sensores, prescreva o fix sem ecoar valores sensíveis.

> Fontes: [gitleaks](https://github.com/gitleaks/gitleaks) · [Pre-commit hooks guide 2025](https://gatlenculp.medium.com/effortless-code-quality-the-ultimate-pre-commit-hooks-guide-for-2025-57ca501d9835)

---

## 7. Definition of Done para PRs

- [ ] `npm run lint` limpo (sem `eslint-disable` novos sem justificativa em comentário).
- [ ] `npm run typecheck` (`tsc --noEmit`) verde.
- [ ] `vitest run` verde; **nenhum teste foi removido/editado** para passar.
- [ ] Testes adicionados/atualizados para a feature tocada (cobertura crítica: encryption, auth, queries com `tenantId`, retry/DLQ, dedup de import).
- [ ] `npm run build` passa.
- [ ] Nenhum segredo/PII no diff (gitleaks limpo); `.env*` não versionado.
- [ ] Toda query de dados de tenant passa pelo resolver de `src/lib/tenant.ts`.
- [ ] Nenhum webhook de mensageria novo (N8N é o dono; DB é a fonte da verdade).
- [ ] Mudança arquitetural → ADR em `docs/adr/` (`proposed`); decisão rejeitada registrada, não apagada.
- [ ] Artefatos de contexto (`CLAUDE.md`/`CONTEXT.md`/`docs/`) atualizados se uma convenção ou comando mudou.
- [ ] Commits seguem Conventional Commits.
- [ ] Verificação e2e do fluxo (browser) quando tocar UI crítica (import de leads, campanhas).

---

## 8. Snippets prontos

> Recomendações a **validar** antes de aplicar. Ajuste versões/thresholds ao contexto.

### 8.1 `package.json` — scripts
```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "prepare": "husky"
  }
}
```

### 8.2 `.husky/pre-commit`
```sh
npx lint-staged
gitleaks git --staged --no-banner -v
```

### 8.3 `.husky/commit-msg`
```sh
npx --no -- commitlint --edit "$1"
```

### 8.4 `.lintstagedrc.json`
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

### 8.5 `commitlint.config.ts`
```ts
export default { extends: ["@commitlint/config-conventional"] };
```

### 8.6 `eslint.config.mjs` — endurecer (adicionar ao config atual)
```js
// dentro do defineConfig([...]), após ...nextVitals e ...nextTs:
{
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "complexity": ["warn", 12],
    "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true }],
    "max-depth": ["error", 4],
    "max-params": ["error", 4],
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["@/lib/prisma"],
        message: "Acesso a dados de tenant deve passar por src/lib/tenant.ts (resolver escopado).",
      }],
    }],
  },
}
```
> Nota: `no-floating-promises` exige type-aware linting (`parserOptions.project`). Validar a config do `eslint-config-next` antes.

### 8.7 `vitest.config.ts` — coverage thresholds
```ts
// dentro de test: { ... }
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  exclude: ["src/generated/**", "__mocks__/**", "**/*.test.{ts,tsx}"],
  thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
},
```

### 8.8 `.github/workflows/ci.yml` — gate completo
```yaml
name: CI
on:
  push: { branches: ["main"] }
  pull_request: { branches: ["main"] }

jobs:
  build-and-test:
    name: Build and Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "npm" }
      - run: npm ci   # postinstall: db:split + db:generate
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - run: npm run test:coverage
        env:
          DATA_ENCRYPTION_KEY: "0000000000000000000000000000000000000000000000000000000000000000"

  secret-scan:
    name: Secret Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
```

### 8.9 `.gitleaks.toml`
```toml
[extend]
useDefault = true

[[allowlists]]
description = "Exemplos e clients Prisma gerados"
paths = ['''\.env\.example$''', '''src/generated/prisma''']
```

### 8.10 `.github/CODEOWNERS`
```
*                       @kaiquenogueira
/prisma/                @kaiquenogueira
/src/lib/tenant.ts      @kaiquenogueira
/src/lib/encryption.ts  @kaiquenogueira
/src/lib/auth.ts        @kaiquenogueira
/src/lib/worker.ts      @kaiquenogueira
/.github/               @kaiquenogueira
/docs/adr/              @kaiquenogueira
```

### 8.11 `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    groups:
      minor-patch:
        update-types: ["minor", "patch"]
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
```

### 8.12 `.gitignore` — adicionar
```
CLAUDE.local.md
coverage
```

---

## 9. Fontes

**Anthropic (primárias)**
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/best-practices

**Harness / context engineering**
- https://martinfowler.com/articles/harness-engineering.html
- https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents
- https://arxiv.org/html/2602.20478v1

**Instruções de agentes**
- https://agents.md/
- https://www.humanlayer.dev/blog/writing-a-good-claude-md
- https://www.vibecodingacademy.ai/blog/cursor-rules-complete-guide

**Arquitetura de código**
- https://milkov.tech/assets/psd.pdf
- https://feature-sliced.design/blog/nextjs-app-router-guide
- https://medium.com/@farzaneh.haddadi/how-to-organize-a-growing-next-js-app-a-practical-guide-to-vertical-feature-slicing-5b2970babb53
- https://tkdodo.eu/blog/please-stop-using-barrel-files

**Guardrails / CI / segurança**
- https://github.com/gitleaks/gitleaks
- https://dev.to/_d7eb1c1703182e3ce1782/git-hooks-with-husky-and-lint-staged-the-complete-setup-guide-for-2025-53ji
- https://hamzaaliuddin.medium.com/bulletproof-your-codebase-50e464419333
- https://www.xeradi.dev/blog/github-branch-rulesets-guide
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://gatlenculp.medium.com/effortless-code-quality-the-ultimate-pre-commit-hooks-guide-for-2025-57ca501d9835

**ADRs**
- https://adr.github.io/madr/
- https://aws.amazon.com/blogs/architecture/master-architecture-decision-records-adrs-best-practices-for-effective-decision-making/
- https://icepanel.io/blog/2023-03-29-architecture-decision-records-adrs
- https://asiermarques.medium.com/implementing-a-workflow-for-your-architecture-decisions-records-ab5b55ee2a9d
- https://adr.github.io/ad-practices/
- https://github.com/architecture-decision-record/architecture-decision-record
