# Sprints de Arquitetura — DestraFlow

Plano de sprints derivado de uma varredura de arquitetura (oportunidades de **aprofundamento** de módulos: virar módulos rasos em profundos, melhorando testabilidade e navegabilidade por IA). Cada achado passou por verificação adversarial via **teste de deleção** — só sobraram costuras reais (2+ adaptadores) ou ganhos claros de superfície de teste; costuras prematuras de 1 adaptador foram rejeitadas.

Ordenado por **prioridade** (bugs ao vivo primeiro) e, dentro da mesma prioridade, por **complexidade** (menor esforço primeiro).

## Vocabulário

| Termo | Significado |
|---|---|
| **Módulo** | Qualquer coisa com interface + implementação (função, classe, arquivo). |
| **Interface** | Tudo que o chamador precisa saber: tipos, invariantes, ordenação, erros, config. |
| **Profundo / Raso** | Profundo = muito comportamento atrás de interface pequena. Raso = interface quase tão complexa quanto a implementação. |
| **Costura (seam)** | Lugar onde se altera comportamento sem editar ali. 1 adaptador = hipotética; 2+ = real. |
| **Localidade** | Mudança/bug/conhecimento concentrados em 1 lugar. |
| **Teste de deleção** | Apagar o módulo: se a complexidade some, era pass-through; se reaparece em N chamadores, valia a pena. |

## Mapa dos sprints

| # | Sprint | Prioridade | Complexidade | Esforço | Depende de | Bug ao vivo? |
|---|--------|-----------|--------------|---------|-----------|--------------|
| [01](./closed/sprint-01-quota-ia-e-sinal-de-uso.md) ✅ | Quota de IA e sinal de uso | 🔴 Crítica | Média | 2–3 dias | — | ✅ Sim — worker nunca reseta quota (throttle permanente) |
| [02](./closed/sprint-02-identidade-de-telefone.md) ✅ | Identidade de telefone | 🔴 Crítica | Média | 3–5 dias | — | ✅ Sim — histórico de chat some na UI |
| [03](./closed/sprint-03-seguranca-credenciais-decrypt.md) ✅ | Segurança de credenciais (decrypt) | 🟠 Alta | Baixa–Média | 2–3 dias | — | ⚠️ Vetor de segurança — credencial em texto plano abre pool |
| [04](./closed/sprint-04-ciclo-de-vida-campaign-message.md) ✅ | Ciclo de vida de CampaignMessage | 🟡 Média | Média | 3–4 dias | — | ⚠️ Latente — drift de conclusão de campanha |
| [05](./sprint-05-contrato-tenant-context.md) | Contrato do TenantContext | 🟡 Média | Média | 2–3 dias | — | ❌ Estrutural (risco de null-deref) |
| [06](./sprint-06-intake-importacao-leads.md) | Intake / importação de leads | 🟡 Média | Média–Alta | 3–5 dias | Sprint 02 | ⚠️ UX — preview diverge do armazenado |
| [07](./sprint-07-limpeza-e-honestidade-de-interface.md) | Limpeza e honestidade de interface | ⚪ Baixa | Baixa | 1–2 dias | — | ❌ Sem bug ao vivo |
| [08](./sprint-08-limpeza-de-lint.md) | Limpeza de lint (ratchet `warn`→`error`) | ⚪ Baixa | Baixa–Média | 2–3 dias | — | ❌ Sem bug ao vivo |

**Esforço total estimado:** ~18–28 dias.

## Ordem recomendada de execução

1. **Sprint 01** e **Sprint 03** primeiro (bug ao vivo de cobrança/throttle + vetor de segurança; ambos baixo-médio esforço, sem dependências).
2. **Sprint 02** (perda de histórico) — habilita o Sprint 06.
3. **Sprint 04** e **Sprint 05** (estrutura/drift; independentes).
4. **Sprint 06** (depende do módulo de telefone do Sprint 02).
5. **Sprint 07** e **Sprint 08** por último (limpeza/dívida; entram a qualquer momento como preenchimento).

> Dependência forte única: **06 → 02** (a normalização de telefone do intake reusa o módulo de identidade de telefone criado no Sprint 02).

## Conteúdo por sprint

### 🔴 Sprint 01 — Quota de IA e sinal de uso
- `personalize()` retorna só `string`; "IA rodou?" é inferido por desigualdade de string em 2 sites → trocar por `{ text, usedLLM, reason }`.
- Regra de quota sem dono, em 3 fragmentos divergentes → módulo `ai-quota` (`canPersonalize` / `recordPersonalization` / reset).
- **Bug ao vivo:** worker não seleciona nem respeita `aiLimitResetAt` → tenant throttled para sempre. **Bug 2:** `resetAIUsage` nunca avança a data de reset; não há cron.

### 🔴 Sprint 02 — Identidade de telefone
- 3 formatos incompatíveis de telefone + 5 `where`-clauses Prisma de igualdade exata → junção lead↔contato falha e o histórico some.
- Módulo de identidade de telefone: canonicaliza para 1 forma armazenada + `findContactByPhone`. **Aplicar na escrita também** (worker, `createLead`), com script de backfill.

### 🟠 Sprint 03 — Segurança de credenciais (decrypt)
- `decrypt()` repassa strings malformadas como texto plano → URL Postgres em texto plano abre `pg.Pool` sem falhar → `decryptSecret` estrito (decifra ou lança) nos 4 sites de conexão.
- `getTenantPrisma`: cache LRU com 4 invariantes invisíveis → keyar por identidade estável + evicção observável (testabilidade).

### 🟡 Sprint 04 — Ciclo de vida de CampaignMessage
- Máquina de estados inlined no worker, "terminalidade" duplicada e divergente → predicados (`isEligibleForSend`/`isTerminal`) + transição pura (`applyOutcome`). Corrige drift de conclusão.
- Envelope `message` do ChatHistory sem dono (tag `"system"` mágica) → codec encode/decode + constante única.

### 🟡 Sprint 05 — Contrato do TenantContext
- Retorno nullable força 39 guards. **23** são o mesmo `throw` (consolidar em `requireTenantContext`); **16** são shapes vazios específicos do chamador (manter, via `getOptionalTenantContext` explícito). Centralizar a string PT-BR.

### 🟡 Sprint 06 — Intake / importação de leads
- Pipeline esfregado entre parser cliente raso e inseridor servidor raso; regras de validação **discordam**, preview mente, zero cobertura de teste → módulo puro `lead-intake` (`linhas → {validLeads, errors, skipped}`). Reusa telefone do Sprint 02.

### ⚪ Sprint 07 — Limpeza e honestidade de interface
- Deletar readers mortos/decoy em `chat.ts`.
- `TenantContext.userRole`: campo populado mas **nunca lido** → remover (ou tornar load-bearing). **Não é vuln:** `src/proxy.ts` (middleware Next 16) autentica todas as rotas e **gateia `/admin` por papel** — a tese original "sem middleware" foi refutada na reverificação.
- Dedups estreitos: config Evolution duplicada; preâmbulo de validação de principal triplicado; nit de import dinâmico em `admin.ts`.

### ⚪ Sprint 08 — Limpeza de lint (ratchet)
- Quita a dívida de lint rebaixada a `warn` quando o gate foi ligado (lint vinha **vermelho**: 742 errors). Estratégia **fix-then-flip por regra** (CI verde a cada passo).
- **7 floating-promises reais** (`void` em effects/handlers) → `error`. ~11 `any` de código tipados (88 em testes ficam `off`). 40 `no-unused-vars`, 5 `error-boundaries`, 2 `unescaped` → `error`.
- Warns **estruturais** (complexity/max-lines/max-params em `worker.ts`/`personalizer`/`campaign-form`) ficam para **depois** dos Sprints 01/04/06, que os eliminam naturalmente.

## Achados rejeitados (não re-sugerir)

A verificação adversarial **descartou** estes como costuras prematuras / framing incorreto:

- **Resolver "tenant runtime" gordo** (`{ tenantPrisma, evolutionClient, aiQuota }` num objeto só) — nenhum chamador precisa dos três; força over-fetch além do pool LRU + checagem de rede. Complexidade real já está correta em `decrypt` / `getTenantPrisma` / `createEvolutionClient`.
- **`baseUrl` de Evolution por tenant** — não existe coluna de base-URL por tenant (servidor compartilhado, instância+chave por tenant). Costura de 0 adaptadores.
- **Transporte HTTP injetável no EvolutionClient** e **costura de provider LLM** (OpenAI é o único) — costuras hipotéticas de 1 adaptador.
- **Helper compartilhado `findContactByPhone` genérico** (Sprint 07) — após deletar o código morto, sobram só 2 sites com semânticas diferentes sobre um `findFirst` de 2 linhas.
