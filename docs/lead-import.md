# Importação de Leads

## Visão Geral

O sistema permite importação em massa de leads a partir de planilhas **CSV** e **XLSX**. O **parsing de arquivo** (Papa/XLSX) acontece no client; as **regras de intake** (mapeamento de cabeçalho, validação, normalização de telefone, tradução de tag e deduplicação) têm **dono único** em `src/lib/lead-intake.ts` — a função pura `buildIntakePlan(rows, opts?)` — consumida **tanto pelo cliente quanto pela Server Action**.

Consequência: o **preview mostra exatamente os valores que serão gravados** (telefone já normalizado, etapa já traduzida) e usa a **mesma regra de validade** do servidor. Não há mais "linha-fantasma" (preview aprovava o que o servidor rejeitava) nem "preview que mente" (valores crus na tela, normalizados no banco). Ver [Sprint 06](./sprint/closed/sprint-06-intake-importacao-leads.md).

## Fluxo

```
Upload (CSV/XLSX) → parse (client) → buildIntakePlan → Preview (normalizado) → Server Action (RawRow[]) → buildIntakePlan + dedup DB → Resultado
```

1. Usuário acessa `/leads` e clica em **"Importar Planilha"**
2. Modal com dropzone (drag-and-drop ou seleção de arquivo)
3. **Validação de cabeçalho** (`validateHeaders`): verifica se as colunas obrigatórias existem
4. **Preview**: `buildIntakePlan(rows)` (sem dedup de DB) → exibe os primeiros 5 **leads válidos já normalizados** + aviso com nº de erros e duplicadas no arquivo
5. **Importação**: a Server Action recebe as **linhas cruas** (`RawRow[]`) e reaplica `buildIntakePlan` com `existingCanonicalPhones` do banco — árbitro autoritativo de validação/normalização/dedup
6. **Relatório**: exibe importados / duplicados / erros

## Campos da Planilha

| Cabeçalho | Campo Interno | Obrigatório | Formato |
|-----------|--------------|:-----------:|---------|
| `nome` ou `name` | `name` | ✅ | Texto, mínimo 2 caracteres |
| `telefone`, `phone`, `celular` ou `whatsapp` | `phone` | ✅ | Qualquer formato (normalizado para +55) |
| `interesse` ou `interest` | `interest` | ❌ | Texto livre |
| `etapa`, `tag`, `status` ou `fase` | `tag` | ❌ | Valor do enum (default: `NEW`) |

### Normalização de Telefone

O sistema normaliza automaticamente para o padrão `+55DDNNNNNNNNN`:

| Entrada | Saída |
|---------|-------|
| `11999999999` | `+5511999999999` |
| `(11) 99999-9999` | `+5511999999999` |
| `5511999999999` | `+5511999999999` |
| `+5511999999999` | `+5511999999999` |

### Normalização de Tags

Aceita valores em português ou inglês (case-insensitive):

| Entrada | Tag Final |
|---------|-----------|
| `Novo`, `NEW` | `NEW` |
| `Qualificação`, `QUALIFICATION` | `QUALIFICATION` |
| `Prospecção`, `PROSPECTING` | `PROSPECTING` |
| `Ligação`, `CALL` | `CALL` |
| `Reunião`, `MEETING` | `MEETING` |
| `Retorno`, `RETURN` | `RETURN` |
| `Perdido`, `LOST` | `LOST` |
| `Cliente`, `CUSTOMER` | `CUSTOMER` |
| Valor não reconhecido | `NEW` (default) |

## Deduplicação

- **Contra banco existente**: Telefones já cadastrados são **ignorados** (`skipped`, motivo `duplicate-existing`). Só ocorre na Server Action (o preview não consulta o banco).
- **Dentro do batch**: Telefones repetidos no mesmo arquivo são ignorados (mantém a primeira ocorrência; motivo `duplicate-in-batch`).
- Comparação é feita pela **forma canônica** do telefone (`canonicalizePhone`, módulo de identidade de telefone do Sprint 02), não por dígitos crus — `(11) 99999-9999`, `5511999999999` e `+5511999999999` colidem corretamente.

## Template de Exemplo

O botão "Baixar CSV" gera um arquivo com BOM UTF-8 para compatibilidade com Excel:

```csv
nome,telefone,interesse,etapa
João Silva,+5511999999999,Investimentos,NEW
Maria Santos,+5521988888888,Seguros,QUALIFICATION
Pedro Souza,(11) 97777-7777,Consultoria,PROSPECTING
```

## Limites

| Limite | Valor |
|--------|-------|
| Tamanho máximo do arquivo | 5 MB |
| Máximo de leads por importação | 5.000 |
| Formatos aceitos | `.csv`, `.xlsx`, `.xls` |

## Dependências

- **PapaParse** (`papaparse`): Parsing de CSV no client
- **SheetJS** (`xlsx`): Parsing de XLSX/XLS no client

## Arquitetura — módulo `lead-intake`

`src/lib/lead-intake.ts` é o **dono único** do conceito "planilha → leads validados". É **puro e síncrono** (sem I/O, sem DOM, sem Prisma), o que o torna testável por tabela em `src/lib/lead-intake.test.ts` sem mockar DB nem DOM.

```typescript
buildIntakePlan(
  rows: RawRow[],                                  // linhas cruas (header → valor)
  opts?: { existingCanonicalPhones?: Set<string> } // telefones canônicos já no banco (só servidor)
): IntakePlan                                       // { validLeads, errors, skipped }
```

- Sem `existingCanonicalPhones` (cliente): preview já normalizado, só dedup in-batch.
- Com `existingCanonicalPhones` (servidor): adiciona dedup de existência.
- Consome `canonicalizePhone` de `@/lib/phone` (Sprint 02) — **não reimplementa** a lógica BR.
- O cap `MAX_IMPORT` (5000) e o caso "nenhuma linha" são impostos pela casca `importLeadsFromCSV` (a função pura não lança).

## Server Action

```typescript
importLeadsFromCSV(rows: RawRow[]): Promise<ImportResult>
// RawRow = { [coluna: string]: string }  — linhas cruas keyadas pelos cabeçalhos
```

Retorna:
```typescript
interface ImportResult {
  imported: number;     // Leads criados com sucesso
  skipped: number;      // Ignorados por duplicidade (batch + existentes)
  errors: Array<{       // Erros de validação por linha (header = 1)
    row: number;
    field: string;
    message: string;
  }>;
}
```
