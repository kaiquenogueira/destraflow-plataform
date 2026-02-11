# Documentação do Webhook (Evolution API)

A plataforma DestraFlow utiliza um endpoint único para receber eventos da Evolution API. Este webhook é responsável por processar mensagens recebidas (criando leads e contatos) e monitorar o status da conexão.

## Configuração

**Endpoint URL**: `https://seu-dominio.com/api/webhook/evolution`
**Método**: `POST`

### Cabeçalhos de Autenticação

Para garantir a segurança, todas as requisições devem incluir o seguinte cabeçalho, que deve corresponder à variável de ambiente `EVOLUTION_WEBHOOK_SECRET`:

```http
x-webhook-secret: SEU_SECRET_AQUI
```

## Configurando na Evolution API

Para configurar uma instância na Evolution API para enviar eventos para este webhook, utilize o endpoint `/webhook/set/{instance}`:

```json
POST /webhook/set/minha-instancia
{
  "enabled": true,
  "url": "https://seu-dominio.com/api/webhook/evolution",
  "webhookByEvents": true,
  "events": [
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE"
  ]
}
```

> **Nota Importante**: A plataforma utiliza o **nome da instância** para identificar o cliente (tenant). O nome da instância configurado na Evolution API deve corresponder exatamente ao nome criptografado salvo no banco de dados (`evolutionInstance`).

## Eventos Processados

### 1. `MESSAGES_UPSERT` (Nova Mensagem)

Recebido quando uma nova mensagem chega no WhatsApp.

**Comportamento:**
1. Verifica se a instância pertence a um cliente válido.
2. Ignora mensagens enviadas pelo próprio usuário (`fromMe: true`).
3. Cria ou atualiza o contato na tabela `WhatsAppContact`.
4. Cria um Lead na tabela `Lead` (com tag `COLD`) se não existir.

### 2. `CONNECTION_UPDATE` (Status da Conexão)

Recebido quando o status da conexão do WhatsApp muda (ex: conectado, desconectado, qr code).

**Comportamento:**
- Registra o log da mudança de estado.
- (Futuro) Pode disparar notificações para o administrador se a conexão cair.

### 3. `MESSAGES_UPDATE` (Status de Entrega)

Recebido quando o status de uma mensagem enviada muda (ex: entregue, lido).

**Comportamento:**
- Apenas loga a atualização por enquanto.
