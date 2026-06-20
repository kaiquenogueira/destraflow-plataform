# Sprint 06 — Intake de leads e pipeline de importação CSV/XLSX

> - **Prioridade:** Média
> - **Complexidade:** Média–Alta
> - **Esforço estimado:** 3–5 dias
> - **Dependências:** Sprint 02 (reutilizar a normalização de telefone do módulo de identidade de telefone)
> - **Subsistemas:** Intake de leads, Importação de planilhas (CSV/XLSX), Identidade de telefone (Sprint 02)
> - **Status:** Não iniciado

## Resumo executivo

O conceito único "planilha → linhas de `Lead` validadas" está hoje dividido entre um parser de cliente raso (`lead-import.tsx`) e um inseridor de servidor raso (`importLeadsFromCSV` em `leads.ts`), cada um dono de metade das regras e nenhum dono do todo. As duas metades **discordam** sobre o que é uma linha válida, o que produz dois bugs ao vivo: (1) linhas que o preview mostra como importáveis são silenciosamente rejeitadas no servidor; (2) o preview mostra telefone/tag crus enquanto o servidor normaliza depois, então **o que o usuário vê no preview não é o que é gravado**. Além disso, o caminho mais branch-heavy do arquivo (`normalizePhone`, `normalizeTag`, dedup) tem **zero cobertura de teste** porque a costura de teste está no lugar errado: `importLeadsFromCSV` recebe linhas já parseadas e o parsing vive em `"use client"`, intestável sem DOM. Este sprint extrai um módulo profundo e **puro** `lead-intake` que vira a única fonte da verdade — "linhas entram, plano de importação sai" — consumido tanto pelo componente React quanto pela server action, e cobre seus ramos com testes table-driven sem DOM nem DB.

## Pontos abordados

1. Pipeline de importação esfregado entre parser cliente raso e inseridor servidor raso, sem costura de teste, com regras de validação que discordam e preview que mente.

---

### Ponto 1 — Pipeline de importação esfregado entre dois módulos rasos, sem dono do conceito e sem costura de teste

**Problema**

O conceito "planilha → leads validados" está repartido em dois módulos rasos que compartilham conhecimento por cópia em vez de por interface.

Lado cliente — `src/components/leads/lead-import.tsx`:

- `HEADER_MAP` (linhas 39–52), `REQUIRED_HEADERS` (55–58), `normalizeHeaderKey` (69–75), `validateHeaders` (77–90) e `mapRowToLead` (92–104) fazem aliasing de header acento-insensitive e mapeamento coluna→campo.
- O critério de "linha válida" do cliente é apenas `name || phone` truthy (linha 169):

```ts
// lead-import.tsx:166-169
const mapped = rows.map(mapRowToLead);
// Filtrar linhas completamente vazias
const validLeads = mapped.filter((l) => l.name || l.phone);
```

- O preview renderiza os valores **crus** vindos da planilha: telefone cru (linha 436, dentro do `<TableCell className="text-sm font-mono">`) e tag crua (linhas 448–451):

```ts
// lead-import.tsx:448-451
{lead.tag ? (
    <Badge variant="outline" className="text-xs">
        {lead.tag}
    </Badge>
) : ( /* fallback NEW */ )}
```

Lado servidor — `src/actions/leads.ts`, `importLeadsFromCSV` (linhas 299–391):

- `normalizePhone` (246–267) carrega a lógica BR multi-ramo (passthrough de `+`, 10–11 dígitos → `+55`, 12–13 dígitos com prefixo `55` → `+`, fallback `+`).
- `normalizeTag` + `PT_TAG_MAP` (269–291) traduzem PT → enum.
- Validação por linha **mais estrita** que a do cliente: `name.trim().length >= 2` (336) **E** `phone.trim().length >= 8` (341), mais regex `^\+?[1-9]\d{10,14}$` (350).
- Dedup contra o DB (`existingPhones`, 326/360) **e** dentro do batch (`seenPhonesInBatch`, 329/366), cap de 5000 (318) e `createMany` (383).

A interface da server action assume a parte interessante já pronta (linhas 299–300):

```ts
// leads.ts:299-301
export async function importLeadsFromCSV(
    leads: Array<{ name: string; phone: string; interest?: string; tag?: string }>
): Promise<ImportResult> {
```

Ou seja: a server action recebe linhas **já parseadas** — não consegue ser exercitada contra bytes CSV/XLSX reais — e o parsing real vive em `"use client"`, intestável sem DOM. Pelo **teste de deleção**: se apagássemos `mapRowToLead`/`validateHeaders`, a complexidade não some, ela **reaparece** no servidor (que teria que re-derivar header mapping); e se apagássemos `normalizePhone`/dedup, ela reaparece no cliente. O conceito não tem dono — está esfregado nos dois, cada um com metade das regras.

Cobertura — `src/actions/leads.test.ts`: o arquivo cobre os 7 fluxos CRUD (`createLead`, `updateLead`, `updateLeadTag`, `deleteLead`, `getLeads`, `getLeadById`, `getLeadsByTag`), mas o `import` na linha 3–11 nem sequer traz `importLeadsFromCSV`. **Zero** asserções sobre `normalizePhone`, `normalizeTag` ou dedup — exatamente o código mais branch-heavy do arquivo.

**Causa raiz**

Um conceito único ("planilha → leads validados") espalhado em N=2 lugares, comunicando por **conhecimento duplicado** em vez de interface. A interface da server action (`Array<{name,phone,...}>` já parseado) **esconde o fato mais importante**: que normalização e dedup acontecem depois e podem reprovar linhas que o cliente aprovou. As duas cópias das regras de validade divergiram (`name || phone` vs. `name>=2 E phone>=8`), o que é o sintoma clássico de regra duplicada sem dono. E a costura de teste foi colocada **dentro** da fronteira impura (DB + `"use client"`), então para testar o comportamento é preciso atravessar a interface com mocks de Prisma e DOM — sinal de que o módulo tem o formato errado ("a interface é a superfície de teste").

**Impacto / bug observável**

Dois bugs ao vivo para o usuário final, mais um buraco estrutural:

1. **Linhas "fantasma" rejeitadas.** Uma linha com `name` preenchido e `phone` vazio (ou `phone` com < 8 caracteres) passa o filtro do cliente (`name || phone` é truthy na linha 169), aparece no preview e é contada no botão "Importar N Leads" (linha 480). No servidor ela é rejeitada (linha 341) e cai em `errors`. O usuário viu "30 leads encontrados", clicou importar, e recebeu "27 importados, 3 erros" sem entender por quê — o preview prometeu algo que a action não cumpre.
2. **Preview mente sobre o que será gravado.** O preview mostra `phone` cru (ex.: `(11) 97777-7777`, linha 436) e `tag` crua (ex.: `Qualificação`, linha 450). O servidor grava `+5511977777777` e `QUALIFICATION`. O usuário não tem como conferir, antes de confirmar, o telefone normalizado nem a tag traduzida — e não vê qual linha será deduplicada.
3. **Estrutural:** o branch mais arriscado do arquivo (telefone BR, dedup) navega para produção sem rede de teste.

**Solução técnica detalhada**

Criar um módulo profundo e **puro** `lead-intake`, dono único do conceito, com interface "linhas cruas entram, plano de importação sai". Essa interface é exatamente a costura que o componente React **e** um teste unitário atravessam — sem DOM, sem DB.

1. **Reusar a normalização de telefone do Sprint 02.** A função `normalizePhone` (leads.ts:246–267) é identidade de telefone e deve viver no módulo de identidade de telefone do Sprint 02 (ex.: `src/lib/phone-identity.ts`, exportando `normalizePhoneBR(raw: string): string` e `phoneDigits(phone: string): string`). O `lead-intake` **consome** esse módulo; não reimplementa a lógica BR. Ver seção "Coordenação com Sprint 02" abaixo. Caso o Sprint 02 ainda não tenha aterrissado quando este começar, mover `normalizePhone` para esse arquivo é o primeiro passo (e o Sprint 02 passa a importá-lo de lá).

2. **Criar `src/lib/lead-intake.ts`** com a forma abaixo (recomendação fundamentada):

```ts
import { normalizePhoneBR, phoneDigits } from "@/lib/phone-identity"; // Sprint 02
import type { LeadTag } from "@/types";

export interface RawRow {
    [column: string]: string;
}

export interface IntakeLead {
    name: string;
    phone: string;      // já normalizado: +55...
    interest?: string;
    tag: LeadTag;       // já traduzida
}

export interface IntakeError {
    row: number;        // número da linha na planilha (header = 1)
    field: string;      // "nome" | "telefone"
    message: string;
}

export type SkipReason = "duplicate-in-batch" | "duplicate-existing";

export interface IntakePlan {
    validLeads: IntakeLead[];
    errors: IntakeError[];
    skipped: Array<{ row: number; reason: SkipReason }>;
}

export const MAX_IMPORT = 5000;

// Aliasing de header (cópia ÚNICA — hoje duplicada no cliente)
export function normalizeHeaderKey(raw: string): string { /* lead-import.tsx:69-75 */ }
export function validateHeaders(rawHeaders: string[]): { valid: boolean; missing: string[] };
export function mapRowToLead(row: RawRow): { name?: string; phone?: string; interest?: string; tag?: string };
export function normalizeTag(raw: string | undefined): LeadTag; // leads.ts:269-291

/**
 * Núcleo profundo e PURO. Recebe linhas cruas + (opcional) telefones já
 * existentes no DB e devolve o plano completo. Sem I/O, sem DOM, sem Prisma.
 */
export function buildIntakePlan(
    rows: RawRow[],
    opts?: { existingPhoneDigits?: Set<string> }
): IntakePlan;
```

`buildIntakePlan` é o dono de TODAS as regras: mapeamento de header, `name.length >= 2`, `phone` normalizado via `normalizePhoneBR`, validação de formato, tradução de tag, dedup in-batch e (quando `existingPhoneDigits` é passado) dedup de existência. Como ele é puro, **o cliente pode chamá-lo sem `existingPhoneDigits`** (preview já normalizado, regras idênticas às do servidor) e o servidor o chama **com** `existingPhoneDigits` (única diferença: o conjunto vem do DB).

3. **Servidor (`leads.ts`) vira casca fina.** ANTES (leads.ts:331–387, loop manual com validação, normalização e dois dedups inline) → DEPOIS:

```ts
export async function importLeadsFromCSV(rows: RawRow[]): Promise<ImportResult> {
    const context = await getTenantContext();
    if (!context) throw new Error("Banco de dados não configurado");
    const { tenantPrisma } = context;

    if (!rows?.length) throw new Error("Nenhum lead para importar");
    if (rows.length > MAX_IMPORT) throw new Error(`Máximo de ${MAX_IMPORT} leads por importação`);

    const existing = await tenantPrisma.lead.findMany({ select: { phone: true } });
    const existingPhoneDigits = new Set(existing.map((l) => phoneDigits(l.phone)));

    const plan = buildIntakePlan(rows, { existingPhoneDigits });

    if (plan.validLeads.length > 0) {
        await tenantPrisma.lead.createMany({ data: plan.validLeads });
    }
    revalidatePath("/leads");
    return {
        imported: plan.validLeads.length,
        skipped: plan.skipped.length,
        errors: plan.errors,
    };
}
```

Note que a interface da action muda: passa a aceitar `RawRow[]` (linhas cruas mapeadas por header) em vez de `Array<{name,phone,...}>` pré-validado — a action deixa de assumir o trabalho já feito.

4. **Cliente (`lead-import.tsx`) vira "lê arquivo + chama + renderiza".** O componente continua dono apenas de I/O de arquivo (Papa/XLSX, linhas 181–232) e UI. ANTES (linhas 166–177, mapeia e filtra com `name || phone`) → DEPOIS: chama `buildIntakePlan(rows)` (sem `existingPhoneDigits`) e renderiza `plan.validLeads` (já normalizados) no preview, mais um aviso com `plan.errors.length`. Isso elimina o "preview que mente": o telefone exibido na linha 436 e a tag na linha 450 passam a ser os valores normalizados, idênticos ao que o servidor gravará. Remover de `lead-import.tsx` as definições locais de `HEADER_MAP`, `REQUIRED_HEADERS`, `normalizeHeaderKey`, `validateHeaders`, `mapRowToLead` (passam a ser importadas do módulo). O `handleImport` (linha 283) passa a enviar as linhas cruas; ou, alternativamente, enviar `plan.validLeads` e o servidor revalida — preferir enviar cruas para o servidor reaplicar dedup de DB de forma autoritativa.

5. **`mapRowToLead` no módulo** deve devolver o objeto parcial cru (sem trim de telefone para `+55` — isso é responsabilidade de `buildIntakePlan` via `normalizePhoneBR`), mantendo a separação "mapear header" vs. "normalizar valor".

Pelo **teste de deleção** pós-refatoração: apagar `lead-intake.ts` faz a complexidade reaparecer em DOIS chamadores reais (componente + action) — costura real, não pass-through.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/phone-identity.ts` (Sprint 02) | novo/editar | Dono de `normalizePhoneBR` e `phoneDigits` (extraídos de `leads.ts:246-267` / `326`). Se Sprint 02 já existe, apenas consumir. |
| `src/lib/lead-intake.ts` | novo | Módulo profundo puro: header mapping, validação, `normalizeTag`, `buildIntakePlan`, `MAX_IMPORT`. Única cópia das regras. |
| `src/lib/lead-intake.test.ts` | novo | Testes table-driven (sem DOM, sem DB). |
| `src/actions/leads.ts` | editar | `importLeadsFromCSV` vira casca: busca `existingPhoneDigits`, chama `buildIntakePlan`, `createMany`. Remover `normalizePhone`, `normalizeTag`, `PT_TAG_MAP`, `VALID_TAGS`, `importLeadSchema` (movidos/absorvidos). Mudar assinatura para `RawRow[]`. |
| `src/components/leads/lead-import.tsx` | editar | Remover `HEADER_MAP`/`REQUIRED_HEADERS`/`normalizeHeaderKey`/`validateHeaders`/`mapRowToLead` locais; importar do módulo. Preview renderiza `plan.validLeads` normalizados + contagem de `errors`. `processRows` (149) chama `buildIntakePlan`. |
| `src/actions/leads.test.ts` | editar | Pode manter; mover testes de import para o arquivo do módulo. Ajustar se a assinatura da action mudar (se houver teste novo da action-casca). |

**Plano de testes**

Toda a lógica antes intestável agora atravessa a costura pura `buildIntakePlan` / `normalizePhoneBR` — sem mock de Prisma e sem DOM. O servidor fica testável passando `existingPhoneDigits` como `Set` literal, em vez de mockar `tenantPrisma.lead.findMany`.

Telefone BR (`normalizePhoneBR`, ramos de `leads.ts:246-267`):

| Entrada | Saída esperada | Ramo |
|---|---|---|
| `+5511999999999` | `+5511999999999` | passthrough `+` |
| `(11) 97777-7777` | `+5511977777777` | 11 dígitos → `+55` |
| `1133334444` | `+551133334444` | 10 dígitos → `+55` |
| `5511999999999` | `+5511999999999` | 13 dígitos prefixo `55` → `+` |
| `551133334444` | `+551133334444` | 12 dígitos prefixo `55` → `+` |
| `123` | `+123` (reprovado depois pela regex) | fallback |

Tradução de tag (`normalizeTag`, `leads.ts:269-291`):

| Entrada | Saída |
|---|---|
| `Qualificação` / `qualificacao` | `QUALIFICATION` |
| `Prospecção` | `PROSPECTING` |
| `Reunião` | `MEETING` |
| `CUSTOMER` | `CUSTOMER` |
| `xpto` / `undefined` | `NEW` |

Aliasing de header (`validateHeaders` / `mapRowToLead`):

| Headers crus | Resultado |
|---|---|
| `["Nome","Telefone"]` | válido; mapeia `name`,`phone` |
| `["whatsapp","name"]` | válido (whatsapp→phone) |
| `["nome"]` | inválido; `missing: ["telefone"]` |
| `["celular","NOME","Etapa"]` | válido; tag mapeada de `etapa` |

`buildIntakePlan` — casos de regra divergente e dedup:

| Cenário | Esperado |
|---|---|
| linha `name="Jo"`, `phone=""` | em `errors` (telefone), **não** em `validLeads` (corrige o bug do filtro `name\|\|phone`) |
| linha `name="A"` | em `errors` (nome < 2) |
| dois rows mesmo telefone (dígitos iguais) | 1 em `validLeads`, 1 em `skipped:"duplicate-in-batch"` |
| row com telefone em `existingPhoneDigits` | `skipped:"duplicate-existing"` |
| 5001 rows | (na action) lança "Máximo de 5000" |

Testes existentes: `src/actions/leads.test.ts` permanece para os CRUD; criar `src/lib/lead-intake.test.ts` para todo o acima. Se for adicionado um teste da action-casca, ele mockará apenas `findMany`/`createMany` e asseverará que `buildIntakePlan` foi alimentado com o `Set` certo — superfície mínima.

**Riscos & migração**

- **Compatibilidade de assinatura:** `importLeadsFromCSV` muda de `Array<{name,phone,...}>` para `RawRow[]`. O único chamador é `lead-import.tsx:283`; ambos mudam no mesmo PR. Sem consumidores externos.
- **Dados existentes:** nenhuma mudança de schema. Telefones já gravados continuam válidos; `phoneDigits` (que faz `.replace(/\D/g,"")`) é usado só para comparação de dedup, idêntico à lógica atual (`leads.ts:326`). Sem backfill necessário.
- **Mudança de comportamento visível:** o preview passa a mostrar valores normalizados (intencional, corrige bug 2) e a esconder/contabilizar linhas que o servidor rejeitaria (corrige bug 1) — comunicar no changelog, pois a contagem de "leads encontrados" pode cair vs. comportamento atual.
- **Ordem de deploy:** módulo `phone-identity` (ou move de `normalizePhone`) → `lead-intake` + testes → action → componente, tudo num PR atômico (a assinatura cruza cliente↔servidor).

**Critérios de aceite**

- [ ] `src/lib/lead-intake.ts` existe e é a **única** cópia de `HEADER_MAP`/`normalizeHeaderKey`/`validateHeaders`/`mapRowToLead`/`normalizeTag` e das regras de validação.
- [ ] `lead-import.tsx` não contém mais nenhuma dessas definições locais; importa do módulo.
- [ ] `importLeadsFromCSV` não contém mais loop de validação/normalização/dedup inline; delega a `buildIntakePlan`.
- [ ] `normalizePhone` foi movida para o módulo de identidade de telefone do Sprint 02 e é consumida (não reimplementada) por `lead-intake`.
- [ ] A regra de "linha válida" é idêntica no preview e no servidor (sem mais linhas-fantasma).
- [ ] O preview mostra telefone normalizado e tag traduzida (igual ao gravado).
- [ ] `src/lib/lead-intake.test.ts` cobre: 6 ramos de telefone BR, ≥5 mapeamentos PT→EN de tag, ≥4 casos de aliasing de header e os 2 caminhos de dedup — sem mock de DOM nem de Prisma.
- [ ] `npm test` verde; nenhum teste novo precisa de `@/lib/tenant` mockado para exercitar a lógica de intake.

## Ordem de execução

1. Aterrissar/confirmar `src/lib/phone-identity.ts` (Sprint 02) com `normalizePhoneBR` + `phoneDigits`. Se Sprint 02 ainda não rodou, mover `normalizePhone`/`phoneDigits` de `leads.ts` para lá como passo inicial deste sprint e deixar o Sprint 02 importar de lá.
2. Criar `src/lib/lead-intake.ts` movendo header mapping (do cliente), `normalizeTag`/`PT_TAG_MAP` (do servidor) e escrevendo `buildIntakePlan` puro.
3. Escrever `src/lib/lead-intake.test.ts` (table-driven) — vermelho → verde antes de tocar nos call sites.
4. Refatorar `importLeadsFromCSV` em `leads.ts` para casca fina sobre `buildIntakePlan`; ajustar assinatura para `RawRow[]`.
5. Refatorar `lead-import.tsx`: remover definições locais, chamar `buildIntakePlan` em `processRows`, renderizar preview normalizado, enviar linhas cruas no `handleImport`.
6. Rodar suíte completa; atualizar `docs/lead-import.md` com a nova arquitetura.

## Nota de verificação

A verificação adversarial **confirmou** o ponto e revisou a severidade de Alta para **Média**: a divergência de regras e o preview enganoso são bugs reais e observáveis, mas degradam a experiência (contagem inflada, valores crus) sem corromper dados — os leads gravados continuam corretos porque o servidor é o árbitro final da normalização e do dedup. A extração do módulo profundo é justificada pelo **teste de deleção** (a complexidade reaparece em dois chamadores reais) e pela cobertura zero do código mais branch-heavy. Ressalva de calibração: **não** sobre-engenheirar o módulo — `buildIntakePlan` deve permanecer puro e síncrono; resista à tentação de injetar o acesso ao DB dentro dele (passar `existingPhoneDigits: Set` mantém a costura limpa; injetar um repositório seria costura prematura). A reutilização da normalização de telefone do Sprint 02 é **dependência dura**: se aquele módulo ainda não existir, o move de `normalizePhone` para `phone-identity.ts` deve ser feito aqui e referenciado pelo Sprint 02, nunca duplicado.
