# 0008 — Postura de segurança de dependências: xlsx via CDN, overrides de transitivos, deferrals

> - **Status:** Accepted
> - **Data:** 2026-06-22
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** `package.json` (`overrides`), `.github/dependabot.yml`, [ADR-0005](./0005-rejected-premature-seams.md)

## Contexto

Um audit de dependências (Dependabot + `npm audit`) acusou 21 vulnerabilidades (8 high / 11 moderate / 2 low). A maioria tinha fix não-quebrante (`npm audit fix`). Três casos exigiram decisão estrutural porque o fix sugerido era um **downgrade do parent** (errado) ou **inexistente no npm**:

1. **`xlsx` (SheetJS)** — HIGH: prototype pollution (GHSA-4r6h-8v6p-xvw6) + ReDoS (GHSA-5pgg-2g8v-p4x9). O npm registry está **congelado em 0.18.5** (vulnerável); a SheetJS parou de publicar no npm e distribui builds corrigidos **apenas** via `cdn.sheetjs.com`. `npm audit` reporta "No fix available".
2. **Transitivos com patch só em versão fora do que o parent declara** — `postcss` (via `next`), `@hono/node-server` (via `@prisma/dev`/`prisma`), `esbuild` (via `vite`/`vitest`). O `npm audit fix --force` queria **downgradar** `next`/`prisma` — inaceitável.
3. **`uuid` < 11.1.1 (via `next-auth` v4)** — moderate. O fix sugerido downgrada `next-auth` para v3 (quebra total de auth).

## Decisão

1. **`xlsx` via CDN oficial, pinado:** declarar `xlsx` como `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` em `dependencies` **e** em `overrides`. O `package-lock.json` grava `resolved` + `integrity` (sha512), tornando o `npm ci` **reprodutível e tamper-evident**. É o canal de distribuição **oficial** do fornecedor — não é supply-chain não-confiável.
2. **`overrides` para forçar transitivos corrigidos sem downgradar parents:** `postcss ^8.5.10`, `@hono/node-server ^1.19.13` (mantém major 1.x; **não** sobe para 2.x), `esbuild ^0.28.1`.
3. **Deferir `uuid`/`next-auth`:** manter as 2 moderate. Justificativa técnica: `next-auth` v4 chama `uuid.v4()` **sem o argumento `buf`**; a CVE só dispara "when buf is provided" (afeta v3/v5/v6 com buf) → **não é alcançável** neste código. O patch só existe em `uuid@11.1.1+`, que é **ESM-only**, enquanto `next-auth` v4 é CJS e depende de `uuid@^8` — forçar 11 arrisca quebrar o login. Não há override seguro. O fix real é a **migração para next-auth v5** (esforço separado).

## Consequências

- Resultado: **21 → 2** vulnerabilidades (0 high, 2 moderate deferidas e não-alcançáveis).
- **Lacuna de monitoramento do `xlsx` (dono: time):** Dependabot/npm-registry **não rastreiam** CVEs futuras de um dep instalado via CDN. Ação recorrente: acompanhar os releases/avisos da SheetJS e **bumpar a versão pinada** (`xlsx-<nova>.tgz`) quando houver correção. Registrar aqui ao atualizar.
- **`esbuild` forçado a 0.28.1 está fora do range declarado pelo `vite` 7 (`^0.27.0`).** Aceitável porque `esbuild` aqui é **ferramenta de teste apenas** — o build de produção é `next build` (webpack/turbopack), que **não usa** vite/esbuild; o raio de impacto do override é o Vitest, validado verde pelos 267 testes. Drop do override reintroduziria GHSA-g7r4-m6w7-qqqr (leitura de arquivo no dev-server, Windows), que não tem fix dentro do range 0.27.x.
- `npm ci` passa a depender da disponibilidade de `cdn.sheetjs.com`.
- Quando `next-auth` v5 entrar, remover o deferral de `uuid` e este parágrafo.
