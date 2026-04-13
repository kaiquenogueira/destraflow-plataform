# Campanhas — Fluxo de Disparo e Retry

## Visão Geral

O sistema de campanhas do DestraFlow segue um modelo de **fila assíncrona** onde mensagens são enfileiradas com um `scheduledAt` e processadas por um worker externo via cron.

## Status de Mensagens (CampaignMessage)

```
PENDING → PROCESSING → SENT
                     ↘ FAILED (retry automático, até 3x)
                          ↘ DEAD_LETTER (falha permanente)
                               ↘ PENDING (retry manual via UI)
```

| Status | Significado |
|--------|-------------|
| `PENDING` | Aguardando próxima execução do cron |
| `PROCESSING` | Worker está enviando neste momento |
| `SENT` | Entregue com sucesso via Evolution API |
| `FAILED` | Falhou, será retentada automaticamente (até 3x) |
| `DEAD_LETTER` | Falha permanente após 3 tentativas |

## Fluxo de Criação

1. Usuário cria campanha via UI (`/campaigns/new`)
2. Server Action `createCampaign` cria o registro `Campaign` (status: `SCHEDULED`) e N registros `CampaignMessage` (status: `PENDING`)
3. Mensagens ficam na fila até o `scheduledAt`

## Fluxo de Processamento (Worker)

**Trigger**: `GET /api/cron/process-messages` (chamada externa a cada minuto)

1. Busca todos os `CrmUser` com `databaseUrl` e `evolutionInstance` configurados
2. Para cada tenant (em paralelo, máx 5):
   - Busca mensagens `PENDING` (scheduledAt ≤ now) + `FAILED` (retryCount < 3)
   - Envia via Evolution API com delay aleatório entre mensagens (2-30s)
   - Sucesso → `SENT`
   - Falha + retryCount < 3 → `FAILED` (retry na próxima execução)
   - Falha + retryCount ≥ 3 → `DEAD_LETTER`
3. `updateCampaignStatuses()` verifica campanhas sem mensagens pendentes e marca como `COMPLETED`

## Fluxo de Retry Manual (DEAD_LETTER)

Quando mensagens ficam em `DEAD_LETTER`, o usuário pode retentar via UI:

### Retry em Massa
- **Action**: `retryCampaignDeadLetters(campaignId)`
- **Efeito**: Todas as `DEAD_LETTER` daquela campanha → `PENDING` (retryCount=0, scheduledAt=now)
- **Campanha**: Se `COMPLETED` → volta para `PROCESSING`
- **Resultado**: Worker processa na próxima execução do cron

### Retry Individual
- **Action**: `retryDeadLetterMessage(messageId)`
- **Efeito**: Apenas aquela mensagem → `PENDING` (retryCount=0, scheduledAt=now)
- **Campanha**: Se `COMPLETED` → volta para `PROCESSING`

## Autenticação do Cron

O endpoint requer `Authorization: Bearer $CRON_SECRET`:

```bash
# Teste manual
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://sua-app.vercel.app/api/cron/process-messages
```

## Personalização via IA

O worker tenta personalizar cada mensagem via `CampaignPersonalizer` antes do envio, respeitando o limite mensal de créditos IA do tenant (`aiMessagesUsed` / `aiMessagesLimit`).
