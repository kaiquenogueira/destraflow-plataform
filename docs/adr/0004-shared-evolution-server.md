# 0004 — Servidor Evolution compartilhado, instância + chave por tenant

> - **Status:** Accepted
> - **Data:** 2026-06-20 (codifica arquitetura existente)
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** `src/lib/evolution.ts`, `prisma/schema.crm.prisma`, [docs/api/webhook.md](../api/webhook.md)

## Contexto

Cada tenant tem uma conexão WhatsApp própria via Evolution API. É preciso decidir se a Evolution é por tenant (base-URL própria) ou compartilhada.

## Decisão

Vamos usar **um servidor Evolution compartilhado** para todos os tenants, com **isolamento por instância**:

- `baseUrl` da Evolution vem de variável de ambiente global (`EVOLUTION_API_URL`) — **não** é por tenant.
- O que é por tenant: `evolutionInstance` (nome da instância) e `evolutionApiKey`, ambos criptografados no `CrmUser`.
- O `CrmUser` **não tem** coluna de base-URL por tenant.
- `createEvolutionClient(instance, apiKey)` (`src/lib/evolution.ts`) é o único ponto que resolve endpoint + credenciais.

## Consequências

- Provisionamento simples: um servidor Evolution para operar/monitorar.
- A tenancy é identificada pelo **nome da instância** no servidor compartilhado.
- **Não** introduzir uma costura de "base-URL por tenant" — não existe segundo servidor no modelo de dados; seria uma costura de zero adaptadores (ver ADR-0005).
- Se um dia houver multi-servidor, este ADR deve ser **superado** por um novo, adicionando a coluna no schema primeiro.

### Formato de telefone na fronteira (anexado em 2026-06-22, Sprint 09)

- **Contrato:** o sistema canonicaliza telefone para E.164 **com `+`** (`+55…`, ver `phone-identity`/Sprint 02). A Evolution API espera **dígitos crus, sem `+`** (campo `number` do `sendText` e `remoteJid` `<n>@s.whatsapp.net`). A conversão `+55… → dígitos` ocorre **apenas** em `EvolutionClient` (método privado `toWhatsAppNumber`), que também **valida** o resultado (rejeita vazio/curto) antes de chamar a API e não loga o número (PII).
- **Não** extrair um helper `toEvolutionNumber` compartilhado/exportado: a conversão é interna ao único cliente que a usa (2 sites no mesmo arquivo) — costura prematura pela regra do 1-adaptador (ver [ADR-0005](./0005-rejected-premature-seams.md) e [Sprint 09](../sprint/sprint-09-costuras-verificadas-pos-rescan.md)).
