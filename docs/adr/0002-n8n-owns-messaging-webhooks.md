# 0002 — N8N é dono dos webhooks de mensageria; o app não escuta eventos

> - **Status:** Accepted
> - **Data:** 2026-06-20 (codifica regra pré-existente de `docs/ARCHITECTURE.md`)
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [docs/ARCHITECTURE.md](../ARCHITECTURE.md), [CONTEXT.md](../../CONTEXT.md), [docs/api/webhook.md](../api/webhook.md)

## Contexto

Eventos conversacionais e de ciclo de vida de entrega de mensagens (WhatsApp/Evolution) precisam ser persistidos. Há duas opções: a app Next.js escutar webhooks da Evolution, ou delegar a uma integração N8N standalone que escreve direto no banco.

## Decisão

Vamos delegar **toda** a lógica conversacional, sincronização de mensagens e eventos de entrega à integração **N8N**. A app Next.js:

- **NÃO** implementa endpoints `[POST] /api/webhook/*` para receber eventos de WhatsApp/Evolution.
- Trata o **Tenant DB como fonte da verdade** para histórico de mensagens (leitura passiva), sem escutar webhooks de vendor.
- Para manipular status de mensagem, escreve no banco ou confia que o N8N escreva.

## Consequências

- A app fica mais simples e sem acoplamento ao formato de webhook da Evolution.
- O **contrato do envelope `ChatHistory.message`** é cross-processo (app + N8N escrevem); seu encode/decode é codificado em `src/lib/chat-envelope.ts` (dono único do discriminador) — ver [Sprint 04](../sprint/closed/sprint-04-ciclo-de-vida-campaign-message.md).
- **Proibido:** adicionar rotas de webhook de mensageria no Next.js. (O diretório vazio `src/app/api/webhook/evolution/` não deve ganhar um `route.ts` de ingestão de eventos.)
- Exceção: o worker (`/api/cron/process-messages`) **envia** mensagens e grava auditoria — isso é saída/escrita, não escuta de webhook, e é permitido.
