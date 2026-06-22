# Sprint 09 — Costuras verificadas pós-rescan: codec de credenciais, validação compartilhada, reabertura de campanha e contrato de telefone Evolution

> - **Prioridade:** Alta (Ponto 1 carrega vetor de segurança latente + drift comprovado em prod; demais Pontos Média/Baixa)
> - **Complexidade:** Média
> - **Esforço estimado:** 4–6 dias
> - **Dependências:** Nenhuma (Sprints 01–08 fechados; reusa `src/lib/phone.ts` do Sprint 02 e `src/lib/encryption.ts` do Sprint 03)
> - **Subsistemas:** Credenciais de tenant (CRM DB), Ações de admin/whatsapp, Validação client↔server (campanhas/leads/templates), Ações de campanha, Integração Evolution
> - **Status:** Planejado (2026-06-22) — derivado de um re-scan de arquitetura pós-Sprint-08. 4 achados sobreviveram à verificação adversarial por **teste de deleção** (8 sub-agentes); 6+ candidatos rejeitados (ver **Nota de verificação**).

## Resumo executivo

Após o fechamento dos Sprints 01–08, um novo re-scan de arquitetura levantou ~13 candidatos a aprofundamento. Cada um foi submetido a um verificador adversarial (teste de deleção + contagem de adaptadores + cruzamento com ADRs). **Quatro** sobreviveram:

1. **Codec de credenciais de tenant** — o trio `{databaseUrl, evolutionInstance, evolutionApiKey}` + `evolutionInstanceHash` é encriptado/decriptado **à mão em 3 sites de escrita + 6 de leitura**, sem dono. O pareamento `evolutionInstance ↔ evolutionInstanceHash` já **divergiu em produção** (existem 2 scripts de reparo). Um site de leitura abre conexão pg com `decrypt` tolerante (vetor de segurança).
2. **Schemas de validação compartilhados client↔server** — regras **load-bearing** (janela de agendamento de 9.5 min; regex de telefone) vivem duplicadas em form (`use client`) e action (`use server`) e **já divergiram** nas mensagens/shapes.
3. **Regra de reabertura de campanha duplicada** — `COMPLETED → PROCESSING` ao retentar dead-letters está escrita **2x** em `campaigns.ts`, mais transições de mensagem cruas que furam o `campaign-message-lifecycle.ts`.
4. **Contrato de formato de telefone na fronteira Evolution** — contrato implícito não-documentado (`+55…` canônico entra, dígitos crus saem). **Honestidade de interface**, não extração de módulo.

Os Pontos 1 e 2 são aprofundamentos reais (passam no teste de deleção, ADR-clean). O Ponto 3 é dedup de localidade in-file. O Ponto 4 é documentação + guarda, **não** um módulo novo.

## Pontos abordados

1. **Codec de credenciais de tenant** — dono único de encode/decode do trio de credenciais + invariante do hash; endurecer o `decrypt` que abre conexão.
2. **Schemas de validação compartilhados** — mover regras de validação load-bearing para módulo plain-TS importável pelos dois lados da costura.
3. **Reabertura de campanha** — extrair helper in-file `reopenCampaignIfCompleted` + dedup do reset de reentrada; **não** empurrar para o lifecycle de mensagem.
4. **Contrato de telefone Evolution** — documentar a fronteira (código + CONTEXT.md + ADR-0004) e adicionar guarda pós-strip; **não** extrair `toEvolutionNumber`.

---

### Ponto 1 — Codec de credenciais de tenant (dono único de encode/decode)

**Problema**
O trio de credenciais de um tenant — `databaseUrl`, `evolutionInstance`, `evolutionApiKey` — e o `evolutionInstanceHash` (índice de busca exata derivado de `hashString(instance)`) são encriptados/decriptados chamando as primitivas de `src/lib/encryption.ts` **inline**, espalhados por ações e Server Components. Nenhum módulo possui "qual é o conjunto de campos secretos", "quais são hasheados junto" ou "strict vs tolerant decrypt por campo".

**Causa raiz**
As primitivas (`encrypt`/`decrypt`/`decryptSecret`/`hashString`/`isCiphertext`, `src/lib/encryption.ts:17-102`) são corretas e profundas, mas o **fluxo de dados** (quais campos, em que combinação) nunca foi encapsulado. Cada call site re-deriva o mesmo conhecimento.

- **Escrita (3 sites, com pareamento instance↔hash divergente):**
  - `src/actions/admin.ts:110-113` (`createUser`) — escreve o trio; hash guardado a `null` quando instance ausente.
  - `src/actions/admin.ts:148-157` (`updateUser`) — pareia instance+hash só quando instance truthy (partial update).
  - `src/actions/whatsapp.ts:87-93` (`saveEvolutionConfig`) — **SEMPRE** escreve instance+hash juntos (instance é obrigatório aqui); nula só `evolutionApiKey`. Shape divergente dos dois acima.
- **Leitura (6 sites de `decrypt` tolerante, idiomas divergentes):**
  - `src/actions/admin.ts:80-85` (`getUserById`), `src/lib/evolution-config.ts:28-31` (`getUserEvolutionConfig`), `src/lib/worker.ts:285-286`, `src/app/(dashboard)/dashboard/page.tsx:140-141`, `src/scripts/check_instance.ts:8-13`.
- **Reparo (prova de drift em prod):**
  - `scripts/backfill-hashes.ts:31-37` e `scripts/migrate-hashes.ts:36-42` — **near-duplicatas** que re-derivam `evolutionInstanceHash` a partir de `decrypt(instance)→hashString` para consertar linhas onde o pareamento foi perdido. A existência destes 2 scripts prova que a invariante de escrita **já quebrou em produção**.
- **Vetor de segurança latente:**
  - `src/actions/tenant-sync.ts:89` — `const connectionString = decrypt(user.databaseUrl)` (tolerante) é usado para **abrir conexão pg**. `decrypt` tolerante repassa plaintext legado verbatim → uma `databaseUrl` em texto plano abriria pool sem falhar. O seam correto (`decryptSecret`, estrito) só existe em `src/lib/prisma.ts:48-49`.

**Impacto / bug observável**
- **Drift comprovado:** `evolutionInstanceHash` dessincronizado de `evolutionInstance` quebra o match por hash de instância (linhas reparadas manualmente 2x).
- **Vetor de segurança:** `tenant-sync.ts` aceitaria uma `databaseUrl` em texto plano e abriria conexão — exatamente a classe de bug que o Sprint 03 fechou no pool principal, mas que **vazou para o caminho de sync**.
- **Localidade ruim:** adicionar um campo de credencial = editar 3+ sites; esquecer o hash em 1 = bug silencioso.

**Solução técnica detalhada**
Criar `src/lib/tenant-credentials.ts` — **codec puro** (sem abrir pool, sem cliente Evolution, sem rede):

```ts
// encode: força o pareamento instance ↔ hash numa única regra
export function encryptTenantCredentials(input: {
  databaseUrl?: string;
  evolutionInstance?: string;
  evolutionApiKey?: string;
}): {
  databaseUrl?: string;
  evolutionInstance?: string;
  evolutionInstanceHash?: string | null;
  evolutionApiKey?: string | null;
};

// decode tolerante: para exibição/uso que NÃO abre pool (form admin, status card)
export function decryptTenantCredentials(user: {
  databaseUrl: string | null;
  evolutionInstance: string | null;
  evolutionApiKey: string | null;
}): { databaseUrl: string; evolutionInstance: string; evolutionApiKey?: string };

// decode estrito do par Evolution, se algum caller precisar isolado
export function decryptEvolutionPair(user): { instanceName: string; apiKey?: string };
```

- **Invariante única:** `evolutionInstance` e `evolutionInstanceHash` só são escritos **juntos** — impossível esquecer um. `createUser`/`updateUser`/`saveEvolutionConfig` passam a chamar `encryptTenantCredentials`; o pareamento e o `null`-guard ficam num lugar.
- **Leitura:** os 6 sites passam a chamar `decryptTenantCredentials` (ou `decryptEvolutionPair`). `getUserEvolutionConfig` mantém sua semântica de `throw` se instance ausente, mas por cima do codec.
- **Segurança:** `tenant-sync.ts:89` troca `decrypt` → `decryptSecret` (estrito) — alinhado ao ADR-0003/Sprint 03; `databaseUrl` que abre conexão **nunca** aceita texto plano.
- **Scripts:** `backfill-hashes.ts` e `migrate-hashes.ts` colapsam para usar o codec (ou deleta-se a duplicata, mantendo 1).
- **Não-objetivo (escopo):** isto **não** é o "resolver de tenant gordo" rejeitado em [ADR-0005](../adr/0005-rejected-premature-seams.md) R1. R1 rejeita um objeto que retorna `{tenantPrisma, evolutionClient, aiQuota}` e força over-fetch (abre pool/cliente/rede). O codec é **transformação pura de colunas** — não abre nada. Verificação confirmou: R1 **não se aplica**; ADR-0003/0004 **apoiam** o codec.

`Call sites — ANTES → DEPOIS:`
```ts
// ANTES (admin.ts createUser) — trio + hash à mão, pareamento solto
evolutionInstance: encrypt(validated.evolutionInstance || ""),
evolutionInstanceHash: validated.evolutionInstance ? hashString(validated.evolutionInstance) : null,
evolutionApiKey: encrypt(validated.evolutionApiKey || ""),

// DEPOIS — pareamento garantido pelo codec
const creds = encryptTenantCredentials(validated);
// ...spread creds no data do prisma.crmUser.create
```

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/tenant-credentials.ts` | novo | Codec puro: `encryptTenantCredentials` / `decryptTenantCredentials` / `decryptEvolutionPair`. Dono da invariante instance↔hash. |
| `src/lib/tenant-credentials.test.ts` | novo | Cobre pareamento, `null`-guards, round-trip, e que o decode **não** abre recurso. |
| `src/actions/admin.ts` | editar | `createUser`/`updateUser`/`getUserById` chamam o codec. |
| `src/actions/whatsapp.ts` | editar | `saveEvolutionConfig` chama o codec. |
| `src/actions/tenant-sync.ts` | editar | `decrypt` → `decryptSecret` na `databaseUrl` que abre conexão (segurança). |
| `src/lib/evolution-config.ts` | editar | `getUserEvolutionConfig` por cima do codec (mantém `throw`). |
| `src/lib/worker.ts` | editar | Leitura do par Evolution via codec. |
| `src/app/(dashboard)/dashboard/page.tsx` | editar | `WhatsAppStatusCard` via codec. |
| `src/scripts/check_instance.ts` | editar | Via codec. |
| `scripts/backfill-hashes.ts` · `scripts/migrate-hashes.ts` | editar/Excluir | Colapsar nas chamadas do codec; manter 1 script de reparo. |
| `docs/adr/0007-codec-de-credenciais-de-tenant.md` | novo | ADR `proposed` no mesmo PR: registra o codec como distinto do ADR-0005 R1. |

**Plano de testes**

| Caso | Entrada | Saída esperada |
|---|---|---|
| Pareamento na escrita | `encryptTenantCredentials({ evolutionInstance: "inst" })` | `evolutionInstance` ciphertext **e** `evolutionInstanceHash = hashString("inst")` presentes juntos |
| Instance ausente | `encryptTenantCredentials({ evolutionApiKey: "k" })` | `evolutionInstanceHash` ausente/`null`; nunca hash órfão |
| Round-trip | encode→decode do trio | plaintext original |
| Strict na conexão | `tenant-sync` com `databaseUrl` plaintext | **lança** (não abre pool) |
| Decode não abre recurso | spy em `pg.Pool`/Evolution | zero chamadas durante `decryptTenantCredentials` |

**Riscos & migração**
- Sem mudança de schema. Linhas legadas com plaintext em `evolutionInstance`/`evolutionApiKey` continuam lidas via decode tolerante.
- A troca para `decryptSecret` em `tenant-sync` pode expor uma `databaseUrl` legada em texto plano — **intencional**: roda-se o backfill de encriptação antes (ou trata-se o `throw` com mensagem prescritiva, sem ecoar o segredo).
- Nunca logar credencial decriptada (regra inegociável CLAUDE.md §2).

**Critérios de aceite**
- [ ] `src/lib/tenant-credentials.ts` é o único lugar que conhece o conjunto de campos de credencial e o pareamento instance↔hash.
- [ ] Os 3 sites de escrita e os 6 de leitura passam pelo codec (nenhum `encrypt(`/`hashString(` de credencial inline fora do codec).
- [ ] `tenant-sync.ts` usa `decryptSecret` para a `databaseUrl` que abre conexão.
- [ ] Restou no máximo 1 script de reparo de hash; ambos usam o codec.
- [ ] ADR-0007 `proposed` no PR, citando explicitamente que não é o R1 do ADR-0005.
- [ ] `lint` + `typecheck` + `test` + `build` verdes; nenhum teste removido/editado para passar.

---

### Ponto 2 — Schemas de validação compartilhados client↔server

**Problema**
Cada domínio (campanhas, leads, templates) mantém **dois** schemas Zod independentes — um no componente de formulário (`use client`), outro na Server Action (`use server`) — e eles **já dessincronizaram**.

**Causa raiz**
Não existe módulo de validação compartilhado. As regras foram copiadas manualmente para cada lado, então a cópia divergiu na mensagem e no shape.

**Impacto / bug observável**
- **Regras load-bearing já divergentes:**
  - Janela de agendamento de campanha (`date.getTime() > Date.now() + (9.5 * 60 * 1000)`): client `src/components/campaigns/campaign-form.tsx:37-46` usa `z.string().refine` com msg *"A data deve ser pelo menos 10 minutos no futuro"*; server `src/actions/campaigns.ts:33-44` usa `z.coerce.date().refine` com msg *"A campanha deve ser agendada com no mínimo 10 minutos de antecedência"*. Mesmo número (9.5 min), **tipos e mensagens diferentes**, e shape diverge (client `leadIds` required `min(1)`; server `targetTag`/`leadIds` opcionais).
  - Regex de telefone `^\+?[1-9]\d{10,14}$`: client `src/components/leads/lead-form.tsx:24-40` (*"...(ex: +5511999999999)"*) vs server `src/actions/leads.ts:12-19` (*"...(use formato +5511999999999)"*). Mesma regex, mensagens divergentes.
- **Regras triviais puramente duplicadas:** `name min(2)` e `template/content min(10)`. O par de templates (`template-form.tsx:16-19` ↔ `templates.ts:9-12`) é **byte-a-byte idêntico**.
- **Risco:** mudar a regra em um lado faz o client aceitar o que o server rejeita (ou vice-versa).

**Solução técnica detalhada**
Criar um módulo **plain-TS sem diretiva** (`use client`/`use server`/`server-only`) com as regras de campo load-bearing, importável pelos dois lados — precedente confirmado: `src/lib/phone.ts:1` só tem um `import type` (apagado no build), e já é importado por Server Actions (`src/actions/leads.ts:4`, `contacts.ts:4`, `message-history.ts:4`) e libs (`worker.ts:14`).

```ts
// src/lib/validation.ts  (sem diretivas — cruza a costura)
export const nameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres");
export const templateContentSchema = z.string().min(10, "...pelo menos 10 caracteres");
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{10,14}$/, "Telefone inválido (ex: +5511999999999)");
export const SCHEDULE_MIN_LEAD_MS = 9.5 * 60 * 1000;
export const futureScheduleRefine = (d: Date) => d.getTime() > Date.now() + SCHEDULE_MIN_LEAD_MS;
export const SCHEDULE_ERROR = "A campanha deve ser agendada com no mínimo 10 minutos de antecedência";
```

- Os refinamentos/regex/mensagens ficam com **dono único**; ambos os lados importam.
- **Não** se força um único `z.object` de campanha — o **shape diverge de propósito** (client exige `leadIds`; server aceita `targetTag` OU `leadIds`). Compartilha-se os campos/refinamentos; cada lado **compõe** seu objeto.
- **Concerns server-only ficam na action:** `xss(validated.content)` (`templates.ts:37`) e `canonicalizePhone` (`leads.ts:30`) **não** migram — só a forma de validação migra.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/validation.ts` | novo | Campos/refinamentos/mensagens load-bearing compartilhados. |
| `src/lib/validation.test.ts` | novo | Cobre a janela de 9.5 min e a regex de telefone como dono único. |
| `src/components/campaigns/campaign-form.tsx` | editar | Importa refinamento de agendamento + `nameSchema`/`templateContentSchema`. |
| `src/actions/campaigns.ts` | editar | Idem; compõe o objeto server-side (targetTag/leadIds opcionais). |
| `src/components/leads/lead-form.tsx` · `src/actions/leads.ts` | editar | Importam `phoneSchema`/`nameSchema`. |
| `src/components/templates/template-form.tsx` · `src/actions/templates.ts` | editar | Importam `nameSchema`/`templateContentSchema`. |

**Plano de testes**

| Caso | Entrada | Saída esperada |
|---|---|---|
| Janela de agendamento | `now + 9 min` | rejeitado em **ambos** os lados, mesma mensagem |
| Janela de agendamento | `now + 11 min` | aceito em ambos |
| Telefone inválido | `"123"` | rejeitado em ambos, mesma mensagem |
| Telefone válido | `"+5511999999999"` | aceito em ambos |
| Shape de campanha | server com `targetTag` sem `leadIds` | aceito (shape server preservado) |

**Riscos & migração**
- Risco baixo: regras puras. Garantir que o módulo **não** importe nada server-only (sem Prisma/`revalidatePath`/segredos) — se importar, quebra o build do client.
- Mensagens unificadas mudam texto visível ao usuário em 2 telas (esperado/desejado).

**Critérios de aceite**
- [ ] Janela de 9.5 min e regex de telefone têm **dono único** em `src/lib/validation.ts`.
- [ ] `campaign-form`/`campaigns`, `lead-form`/`leads`, `template-form`/`templates` importam do módulo compartilhado.
- [ ] Shapes específicos de cada lado preservados (campanha não é forçada a um objeto único).
- [ ] `xss`/`canonicalizePhone` permanecem na action (server-only).
- [ ] Gates verdes; nenhum teste removido/editado.

---

### Ponto 3 — Reabertura de campanha duplicada (localidade in-file)

**Problema**
A regra de **reabertura de campanha** — `campaign.status === "COMPLETED"` ⇒ voltar para `PROCESSING` ao retentar dead-letters — está escrita **2x** em `src/actions/campaigns.ts`, e o arquivo ainda hand-rola transições de mensagem cruas que furam o `campaign-message-lifecycle.ts`.

**Causa raiz**
`campaigns.ts` **não importa nada** de `@/lib/campaign-message-lifecycle` (confirmado: zero hits para o path e para os 6 símbolos exportados, ver imports em `campaigns.ts:3-8`). As transições foram escritas com strings de status literais.

**Impacto / bug observável**
- **Regra de reabertura duplicada (2 sites):**
  - `src/actions/campaigns.ts:371-379` (`retryCampaignDeadLetters`) — spread condicional no `$transaction` em massa.
  - `src/actions/campaigns.ts:414-426` (`retryDeadLetterMessage`) — branch separado com `findUnique` extra. Mesmo predicado, mesma escrita.
- **Transições de mensagem cruas (bypass do lifecycle):**
  - `campaigns.ts:250-260` (`cancelCampaign`) — `PENDING → FAILED` literal.
  - `campaigns.ts:361-370` e `404-412` — `DEAD_LETTER → PENDING` com `retryCount:0` reset, **shape idêntico duplicado** nos dois retries.
  - `campaigns.ts:400-402` — guard de elegibilidade de reentrada como string compare `!== "DEAD_LETTER"`.
- **Risco:** drift latente (hoje os 2 sites são idênticos); mudar a regra de reabertura em 1 lugar quebra o outro silenciosamente.

**Solução técnica detalhada**
- **Movimento (a) — regra de reabertura:** extrair helper **in-file** (campaign-level) em `campaigns.ts`:
  ```ts
  async function reopenCampaignIfCompleted(tenantPrisma, campaignId: string) {
    const campaign = await tenantPrisma.campaign.findUnique({ where: { id: campaignId } });
    if (campaign?.status === "COMPLETED") {
      await tenantPrisma.campaign.update({ where: { id: campaignId }, data: { status: "PROCESSING" } });
    }
  }
  ```
  Os 2 retries chamam o helper. (No caminho em massa, manter a forma `$transaction` consistente.)
- **Movimento (b) — reset de reentrada:** extrair a constante/fábrica do shape de reset `DEAD_LETTER → PENDING` (`{ status: "PENDING", retryCount: 0, error: null, scheduledAt: new Date() }`) usada em 361-370 e 404-412.
- **Nota de escopo (não fazer agora):** **não** empurrar a reabertura para `campaign-message-lifecycle.ts`. Verificação confirmou: esse módulo possui deliberadamente só estado **de mensagem** (`UNFINISHED_STATUSES`, `applyOutcome`, `eligibleForSendWhere`) e seu cabeçalho documenta a reabertura como responsabilidade da **camada de ação** (lifecycle `lib/campaign-message-lifecycle.ts:27-30`). Misturar `Campaign.status` ali borraria a fronteira. Aplicando o **teste de deleção**: a regra de reabertura concentra em 2 call sites de campanha → helper in-file (costura real de 2 adaptadores, no nível certo).

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/actions/campaigns.ts` | editar | `reopenCampaignIfCompleted` + fábrica de reset de reentrada; 2 retries chamam ambos. |
| `src/actions/campaigns.test.ts` | editar | Cobre reabertura (COMPLETED→PROCESSING) e shape de reset via os 2 caminhos. |

**Plano de testes**

| Verificação | Entrada | Saída esperada |
|---|---|---|
| Reabertura em massa | campanha `COMPLETED` + dead-letters retentados | campanha → `PROCESSING`, mensagens → `PENDING` (retryCount 0) |
| Reabertura individual | 1 dead-letter retentado em campanha `COMPLETED` | campanha → `PROCESSING` |
| Sem reabertura | campanha `PROCESSING` | status inalterado |
| Guard de elegibilidade | mensagem não-`DEAD_LETTER` | lança erro de "falha permanente" |

**Riscos & migração**
- Sem mudança de schema/comportamento; refator puro de localidade. Mantém-se o `$transaction` em massa para não alterar a atomicidade.

**Critérios de aceite**
- [ ] A regra `COMPLETED → PROCESSING` existe **uma vez** (helper in-file), chamada pelos 2 retries.
- [ ] O shape de reset de reentrada tem fonte única.
- [ ] **Nada** de `Campaign.status` foi movido para `campaign-message-lifecycle.ts`.
- [ ] Gates verdes; nenhum teste removido/editado.

---

### Ponto 4 — Contrato de formato de telefone na fronteira Evolution (honestidade)

**Problema**
Existe um contrato real, funcional, mas **não-documentado** na fronteira Evolution: callers passam o `lead.phone` armazenado (forma E.164-ish, `+55…`), e o `EvolutionClient` **silenciosamente** remove tudo que não é dígito (`phone.replace(/\D/g, "")`), produzindo dígitos crus para a API.

**Causa raiz**
A normalização foi escrita inline com um comentário que descreve o **mecanismo** ("Normalizar número de telefone"), não o **contrato** (que forma entra, por que o `+` cai, o que é um número válido). O resto do sistema canonicaliza **com** `+` (`src/lib/phone.ts:25-46` → `+55…`), e só este seam o remove.

**Impacto / bug observável**
- **Assimetria silenciosa:** `+` em todo lugar, dígitos crus só no fio da Evolution. Dois sites:
  - `src/lib/evolution.ts:139-157` (`sendMessage`) — dígitos crus no campo `number` do `sendText`.
  - `src/lib/evolution.ts:162-187` (`fetchMessages`) — dígitos crus em `${number}@s.whatsapp.net` (remoteJid).
- **Cadeia de callers** passa a forma armazenada: `worker.ts:139` (`sendMessage(message.lead.phone, …)`), `message-history.ts:99-112` (`fetchMessages(phone)` de `lead.phone`).
- **Sem guarda:** uma string vazia/curta pós-strip é enviada à API como está → falha opaca, sem erro claro.
- **Gap de docs confirmado:** `docs/adr/0004-shared-evolution-server.md:14-26` e `CONTEXT.md:74-75` (glossário "Evolution instance") não dizem **nada** sobre formato de telefone na fronteira.

**Solução técnica detalhada**
- **Documentar o contrato** (honestidade de interface):
  - JSDoc em `sendMessage`/`fetchMessages` (`evolution.ts`): "Entrada: telefone canônico `+55…` (forma armazenada de `lead.phone`). Saída no fio: dígitos crus (`number` / `remoteJid`). O `+` é removido aqui de propósito."
  - Nota em `CONTEXT.md` (entradas "Evolution instance" e/ou `phone-identity`): canônico `+55…` em todo o sistema → **dígitos crus apenas no fio da Evolution**.
  - Amend em ADR-0004 (seção Consequências) registrando a forma de telefone na fronteira — sem reescrever a decisão aceita.
- **Guarda pós-strip** (defensivo, sem PII em log):
  ```ts
  const number = phone.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(number)) return false; // ou throw com mensagem sem ecoar o número
  ```
- **Não fazer (escopo):** **não** extrair `toEvolutionNumber`. Aplicando o **teste de deleção**: um `replace(/\D/g,"")` de 1 linha em exatamente 2 sites internos do mesmo arquivo, zero callers externos, 1 implementação → helper não esconde nada (território de costura prematura, [ADR-0005](../adr/0005-rejected-premature-seams.md)). O teste atual `src/lib/evolution.test.ts:197-205` já fixa o comportamento de fio (`+5511999999999` → `5511999999999`).

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/evolution.ts` | editar | JSDoc do contrato em `sendMessage`/`fetchMessages` + guarda pós-strip. |
| `src/lib/evolution.test.ts` | editar | Caso para input inválido pós-strip (vazio/curto) → rejeitado. |
| `CONTEXT.md` | editar | Documentar a forma de telefone na fronteira Evolution. |
| `docs/adr/0004-shared-evolution-server.md` | editar | Amend em Consequências (sem reescrever a decisão). |

**Plano de testes**

| `raw` | comportamento | `number`/resultado |
|---|---|---|
| `+5511999999999` | send | `5511999999999` (inalterado, regressão) |
| `""` ou `"+55"` | send | rejeitado pela guarda (não chega à API) |
| `+5511999999999` | fetch | remoteJid `5511999999999@s.whatsapp.net` |

**Riscos & migração**
- Risco mínimo (doc + guarda). A guarda muda o comportamento só para entradas já inválidas (que falhariam na API de qualquer forma). Não logar o número (PII).

**Critérios de aceite**
- [ ] Contrato documentado em `evolution.ts` (JSDoc), `CONTEXT.md` e ADR-0004 (amend).
- [ ] Guarda pós-strip rejeita dígitos inválidos sem ecoar PII.
- [ ] **Nenhum** módulo `toEvolutionNumber` criado.
- [ ] Regressão `+5511999999999 → 5511999999999` mantida; gates verdes.

---

## Ordem de execução

1. **Ponto 1** primeiro — carrega o vetor de segurança (`tenant-sync` decrypt) e o drift comprovado em prod (hash). Maior alavancagem + ADR-0007.
2. **Ponto 3** — refator de localidade pequeno e independente; baixo risco.
3. **Ponto 2** — schemas compartilhados; toca client + server, mais superfície de teste.
4. **Ponto 4** — documentação + guarda; entra a qualquer momento como preenchimento.

Pontos são independentes; podem virar PRs separados. Ponto 1 deve incluir o ADR-0007 `proposed` no mesmo PR (DoD).

## Nota de verificação

Re-scan de 2026-06-22: 3 exploradores levantaram candidatos; **8 sub-agentes adversariais** aplicaram teste de deleção + contagem de adaptadores + cruzamento com ADRs. Resultado:

**Confirmados (este sprint):**
- **Ponto 1** — codec de credenciais. Costura real: invariante instance↔hash em 3 sites de escrita + reparo em prod (2 scripts) + vetor de `decrypt` tolerante abrindo conexão. **ADR-0005 R1 não se aplica** (codec puro, não abre pool/cliente/rede) — verificado linha a linha.
- **Ponto 2** — schemas compartilhados. 2 regras load-bearing já divergentes; módulo plain-TS importável pelos dois lados (precedente `phone.ts`). Sem conflito de ADR (2º adaptador já existe = costura real).
- **Ponto 3** — reabertura de campanha. Dup em exatamente 2 sites; fix in-file no nível de campanha (não no lifecycle de mensagem, que **deliberadamente** não possui `Campaign.status`).
- **Ponto 4** — contrato de telefone Evolution. Gap de docs **confirmado** (ADR-0004/CONTEXT silenciam). **Falha** o teste de deleção para extração de módulo → vira honestidade/guarda, não `toEvolutionNumber`.

**Rejeitados (não re-sugerir):**
- **Quota de IA / personalizer divergente** — REJEITADO. Sprint 01 já unificou em `ai-quota.ts`; worker totalmente cabeado (`canPersonalize`/`applyReset`/`recordPersonalization`, `CampaignPersonalizer.personalize`, seleciona `aiLimitResetAt`; shape `{text,usedLLM,reason}` presente). Sem bug.
- **`encryption.ts` sem testes** — REJEITADO. `src/lib/encryption.test.ts` existe, 11 testes passando, AES-GCM real (round-trip, `decryptSecret`-throws, `isCiphertext`). Candidato baseado em estado obsoleto.
- **Vocabulário de auth inconsistente** — majoritariamente REJEITADO. `auth.ts` é outra altitude (callback NextAuth, circular se chamasse `validatePrincipal`); `admin-auth.ts` é autorização (não identidade); `message-history.ts` é fallback gracioso deliberado. Só `whatsapp.ts:getCurrentUserId` é micro-dup de 4 linhas — já aceito pelo Sprint 07.
- **`toEvolutionNumber`** — REJEITADO como costura prematura (1 implementação, 2 sites internos). Ver Ponto 4.
- **Triagem T1–T6** (wrapper `xss()`, range de data, aritmética de paginação, shapes de resposta vazia, superfície do tenant-pool, mock do redis) — todos REJEITADOS: pass-through/churn ou já decididos (shapes vazios = Sprint 05, per-caller).

> **Definition of Done** (ver [HARNESS-ENGINEERING.md §7](../HARNESS-ENGINEERING.md)): `lint` + `typecheck` + `test` + `build` verdes · nenhum teste removido/editado · sem segredo/PII no diff · query de tenant via resolver · ADR-0007 `proposed` no PR do Ponto 1 · CONTEXT.md/ADR-0004 atualizados no Ponto 4.
