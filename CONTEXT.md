# CONTEXT — Glossário de Domínio do DestraFlow

Vocabulário canônico do projeto. Use **estes termos exatos** em código, nomes de testes, issues, ADRs e propostas de refatoração. Quando um conceito não estiver aqui, ou você está inventando linguagem (reconsidere) ou há uma lacuna real (adicione o termo aqui).

> Este arquivo alimenta os agentes de IA e as revisões de arquitetura. Mantê-lo vivo é parte da [Definition of Done](./docs/HARNESS-ENGINEERING.md).

---

## Fronteiras (boundaries) — leia primeiro

O sistema tem **três fronteiras de processo**. Confundi-las é a origem de quase todo bug de arquitetura aqui.

| Fronteira | O que é | Fonte da verdade |
|---|---|---|
| **CRM DB (central)** | Banco único de login/admin. Modelo `CrmUser` (credenciais, papel, `databaseUrl` criptografada, credenciais Evolution, quota de IA). Schema: `prisma/schema.crm.prisma`. Cliente Prisma: `prisma` em `src/lib/prisma.ts`. | Identidade do usuário, configuração do tenant, quota de IA. |
| **Tenant DB (por tenant)** | Um banco **por tenant**, resolvido em runtime a partir da `databaseUrl` criptografada do `CrmUser`. Contém todos os dados de CRM (leads, campanhas, mensagens, contatos, histórico). Schema: `prisma/schema.tenant.prisma`. Cliente: `getTenantPrisma(url)`. | Dados de negócio do cliente. |
| **N8N + Evolution API** | Integração externa. **N8N é dono dos eventos conversacionais e do ciclo de entrega de mensagens** e escreve direto no Tenant DB. A Evolution API é o gateway WhatsApp (servidor **compartilhado**, instância+chave por tenant). | Eventos de mensagem WhatsApp (entrada/saída). Ver [ADR-0002](./docs/adr/0002-n8n-owns-messaging-webhooks.md). |

**Regra de ouro:** o app Next.js trata o **DB como fonte da verdade** para histórico de mensagens. Não escutar webhooks de mensageria na app (ver ADR-0002).

---

## Termos

**Tenant**
Um cliente da plataforma. Mapeia 1:1 para um `CrmUser` com papel `USER` e uma `databaseUrl` configurada. Cada tenant tem seu próprio Tenant DB e sua própria instância Evolution.
_Evite_: "organização", "workspace", "conta".

**CrmUser**
Registro no CRM DB central. Guarda identidade (login, papel `ADMIN`/`USER`), a `databaseUrl` **criptografada** do Tenant DB, as credenciais Evolution criptografadas (`evolutionInstance`, `evolutionApiKey`, `evolutionPhone`) e a **quota de IA** (`aiMessagesUsed`, `aiMessagesLimit`, `aiLimitResetAt`).

**TenantContext**
Objeto resolvido por `getTenantContext()` (`src/lib/tenant.ts`): a sessão atual → principal validado (`src/lib/principal.ts`) → `{ tenantPrisma, userId, ...quota }`. Retorna `null` quando o usuário não tem `databaseUrl` (ex.: admin). Ver [Sprint 05](./docs/sprint/sprint-05-contrato-tenant-context.md) para o contrato `require` vs `optional`. **Não carrega papel**: autorização por papel vive na borda (`src/proxy.ts`) e em `requireAdmin`, não no contexto de tenant — ver [ADR-0006](./docs/adr/0006-tenant-action-authorization.md).

**Lead**
Contato de CRM dentro de um Tenant DB. Tem `tag` (estágio do funil), `phone`, `interest`, `aiSummary`, e `notes` (`LeadNote`). Telefone é **identidade**: ver `phone-identity` ([Sprint 02](./docs/sprint/sprint-02-identidade-de-telefone.md)).

**LeadTag** _(funil)_
Estágio do lead no pipeline: `NEW`, `QUALIFICATION`, `PROSPECTING`, `CALL`, `MEETING`, `RETURN`, `LOST`, `CUSTOMER`. Enum no schema; rótulos em PT na UI.

**Campaign**
Disparo em massa de uma mensagem-template para um conjunto de leads (por `targetTag` ou `leadIds`). Tem `status` (`CampaignStatus`) e `scheduledAt` (mínimo ~10 min no futuro). Cria N `CampaignMessage` na fila.
**CampaignStatus:** `SCHEDULED → PROCESSING → COMPLETED`, ou `CANCELLED`.

**CampaignMessage**
Unidade de entrega na fila do Tenant DB. É a **máquina de estados central** da plataforma.
**MessageStatus (ciclo de vida):**
`PENDING → PROCESSING → SENT`, ou em falha `→ FAILED` (com `retryCount++`, elegível a retry enquanto `retryCount < MAX_RETRIES`), ou `→ DEAD_LETTER` (falha permanente). Cancelamento de campanha move `PENDING → FAILED`. Retry de dead-letter move `DEAD_LETTER → PENDING` (reset `retryCount=0`).
A definição de "terminado" e o predicado de elegibilidade são **load-bearing** e têm dono único em `src/lib/campaign-message-lifecycle.ts` (`eligibleForSendWhere` / `unfinishedMessagesWhere` / `applyOutcome` / `MAX_RETRIES`). Invariante: todo status que bloqueia conclusão é re-selecionável pelo worker (`UNFINISHED_STATUSES ⊆` elegível) — ver [Sprint 04](./docs/sprint/closed/sprint-04-ciclo-de-vida-campaign-message.md).
_Evite_: "job", "task" (use **mensagem de campanha**).

**DEAD_LETTER**
Estado terminal de falha de uma `CampaignMessage` após `MAX_RETRIES` tentativas. Reentrável manualmente via `retryCampaignDeadLetters` / `retryDeadLetterMessage`.

**Worker**
`src/lib/worker.ts`. Roda via cron (`/api/cron/process-messages`): varre tenants, busca mensagens elegíveis, personaliza com IA (dentro da quota), envia pela Evolution, aplica transições de estado com retry/backoff, e persiste auditoria em `ChatHistory`. Processa tenants em paralelo com concorrência limitada.

**Template**
Texto de mensagem com variáveis (`{{nome}}`, `{{telefone}}`, `{{interesse}}`) resolvidas por `processTemplate`. Pode ser hiper-personalizado por IA antes do envio.

**Personalização de IA / Quota de IA**
`CampaignPersonalizer` (`src/services/ai/`) reescreve um payload usando contexto do lead. Governado por uma **quota mensal por tenant** (`aiMessagesUsed`/`aiMessagesLimit`/`aiLimitResetAt`) no CRM DB. A regra de quota é hoje divergente entre worker e actions — ver [Sprint 01](./docs/sprint/closed/sprint-01-quota-ia-e-sinal-de-uso.md).

**WhatsAppContact**
Registro no Tenant DB representando um número WhatsApp. Identificado por `whatsapp` (telefone). Criado pelo worker (auditoria) ou por sync de contatos. Casamento por telefone deve ser canônico — ver `phone-identity`.

**ChatHistory**
Histórico de conversa no Tenant DB. Campo `message` é um **envelope JSON** (`{ type, content }`); `type === "system"` (`OUTBOUND_AUDIT_TYPE`) significa mensagem **outgoing** de auditoria gravada pelo worker. N8N também escreve nesta tabela. O encode/decode do envelope tem dono único em `src/lib/chat-envelope.ts` (`encodeOutboundAudit` / `decodeChatEnvelope`); nenhum lado repete o discriminador solto — ver [Sprint 04](./docs/sprint/closed/sprint-04-ciclo-de-vida-campaign-message.md).
_Evite_: "mensagem" sem qualificar (ambíguo com `CampaignMessage`).

**ExternalNotification**
Notificação externa (Tenant DB), exibida em `/notifications`.

**Evolution instance**
A instância WhatsApp de um tenant na Evolution API (servidor **compartilhado**). Identificada por `evolutionInstance` (nome) + `evolutionApiKey`. **Não há base-URL por tenant** — ver [ADR-0004](./docs/adr/0004-shared-evolution-server.md).

**Formato de telefone na fronteira Evolution:** o sistema canonicaliza telefone para E.164 **com `+`** (`+55…`, ver `phone-identity`); a Evolution API espera **dígitos crus, sem `+`** (campo `number` e `remoteJid` `<n>@s.whatsapp.net`). A conversão `+55… → dígitos` acontece **só** em `EvolutionClient` (`src/lib/evolution.ts`, método privado), com guarda que rejeita números inválidos antes da chamada. Não é um helper compartilhado (ver [ADR-0004](./docs/adr/0004-shared-evolution-server.md) e a rejeição de costura em [Sprint 09](./docs/sprint/sprint-09-costuras-verificadas-pos-rescan.md)).

---

## Vocabulário de arquitetura

Para discutir **profundidade de módulos** (não domínio), o projeto usa o vocabulário de [docs/HARNESS-ENGINEERING.md](./docs/HARNESS-ENGINEERING.md): **módulo, interface, profundidade, costura (seam), localidade, alavancagem, teste de deleção**. Não use "service", "component", "boundary" (sobrecarregado) ao falar de design de módulo.
