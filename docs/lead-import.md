# Importação de Leads

## Visão Geral

O sistema permite importação em massa de leads a partir de planilhas **CSV** e **XLSX**. O parsing acontece no client-side e os dados validados são enviados via Server Action para persistência.

## Fluxo

```
Upload (CSV/XLSX) → Validação de Cabeçalho → Preview → Confirmação → Server Action → Resultado
```

1. Usuário acessa `/leads` e clica em **"Importar Planilha"**
2. Modal com dropzone (drag-and-drop ou seleção de arquivo)
3. **Validação de cabeçalho**: verifica se as colunas obrigatórias existem
4. **Preview**: exibe os primeiros 5 registros para conferência
5. **Importação**: Server Action processa, valida e insere no banco
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

- **Contra banco existente**: Telefones já cadastrados são **ignorados** (skipped)
- **Dentro do batch**: Telefones repetidos no mesmo arquivo são ignorados (mantém primeira ocorrência)
- Comparação é feita por **dígitos** (ignora formatação)

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

## Server Action

```typescript
importLeadsFromCSV(leads: Array<{
  name: string;
  phone: string;
  interest?: string;
  tag?: string;
}>): Promise<ImportResult>
```

Retorna:
```typescript
interface ImportResult {
  imported: number;     // Leads criados com sucesso
  skipped: number;      // Ignorados por duplicidade
  errors: Array<{       // Erros de validação por linha
    row: number;
    field: string;
    message: string;
  }>;
}
```
