# Sprint 02 — Identidade de telefone e junção lead ↔ mensagem

> - **Prioridade:** Crítica
> - **Complexidade:** Média
> - **Esforço estimado:** 3–5 dias
> - **Dependências:** Nenhuma. (O Sprint 06 — intake/N8N — reutiliza a normalização criada aqui.)
> - **Subsistemas:** Importação de leads, Histórico de mensagens, Worker de mensagens, Sincronização de contatos, Schema Prisma (Lead / WhatsAppContact)
> - **Status:** Não iniciado

## Resumo executivo

Existe um **bug ao vivo de perda de histórico**: o telefone de um lead e o telefone de um `WhatsAppContact` são comparados por **igualdade exata de string**, mas nunca há garantia de que estejam no mesmo formato. Leads importados são normalizados para `+55…`; leads manuais e contatos gravados pelo worker/N8N são gravados **crus** (como vieram). Quando os formatos divergem, `getMessageHistoryByLead` e `getChatHistoryByLead` retornam `[]` silenciosamente e a UI mostra "Nenhuma mensagem" — mesmo havendo histórico no banco. A causa raiz é que o conceito "esses dois telefones são o mesmo número?" é uma **decisão sem dono**: vive inline em cinco where-clauses do Prisma, em três representações incompatíveis (dígitos puros, `+55…`, cru). Este sprint cria um **módulo profundo de identidade de telefone** (`src/lib/phone.ts`) que canonicaliza para **uma única forma armazenada** e centraliza o match, aplicando-o tanto na **leitura quanto na escrita**, com um script de backfill para regularizar dados legados.

## Pontos abordados

1. Identidade de telefone sem dono — três noções de "mesmo número" coexistindo, causando perda de histórico.

---

### Ponto 1 — Identidade de telefone sem dono

**Problema**

Hoje existem **três representações** do mesmo número em circulação, e o código compara umas com as outras sem uma definição compartilhada.

1. **Dedup de import compara por dígitos puros.** Em `src/actions/leads.ts:326` os telefones existentes viram dígitos puros para o `Set` de deduplicação, e em `src/actions/leads.ts:347` o telefone do batch também:

```ts
// src/actions/leads.ts:323-326
const existingLeads = await tenantPrisma.lead.findMany({
    select: { phone: true },
});
const existingPhones = new Set(existingLeads.map((l: { phone: string }) => l.phone.replace(/\D/g, "")));

// src/actions/leads.ts:346-347
const normalizedPhone = normalizePhone(raw.phone.trim());
const phoneDigits = normalizedPhone.replace(/\D/g, "");
```

   O helper `normalizePhone` (`src/actions/leads.ts:246-267`) só é chamado no caminho de import (`src/actions/leads.ts:346`) e produz a forma `+55…`. Ou seja: **a única função que sabe canonicalizar telefone é privada de um arquivo de import e não é usada em mais nenhum lugar.**

2. **A junção lead → mensagem usa igualdade EXATA de string.** Em `src/actions/message-history.ts:72-73`:

```ts
// src/actions/message-history.ts:72-74
const contact = await tenantPrisma.whatsAppContact.findFirst({
    where: { whatsapp: phone },
});
```

   E o mesmo padrão em `src/actions/chat.ts:65-67`:

```ts
// src/actions/chat.ts:65-67
const contact = await tenantPrisma.whatsAppContact.findFirst({
    where: { whatsapp: lead.phone },
});
```

   Se não houver match exato, ambos retornam `[]` **silenciosamente** (`src/actions/message-history.ts:76-78`, `src/actions/chat.ts:69-71`) → a UI exibe "Nenhuma mensagem".

3. **O audit do worker faz match exato E grava o telefone CRU.** Em `src/lib/worker.ts:226-228` busca por igualdade exata, e em `src/lib/worker.ts:231-238` cria o contato com o telefone **verbatim** (como a campanha passou via `message.lead.phone`):

```ts
// src/lib/worker.ts:226-239
let contact = await tenantPrisma.whatsAppContact.findFirst({
    where: { whatsapp: message.phone },
});

if (!contact) {
    contact = await tenantPrisma.whatsAppContact.create({
        data: {
            whatsapp: message.phone,
            name: message.name,
            createdAt: new Date(),
            isManual: false,
        },
    });
}
```

   O contato passa a existir na forma que a campanha entregou, **nunca canonicalizada**.

4. **`createLead` NÃO normaliza.** Em `src/actions/leads.ts:31-33` grava `validated.phone` como veio:

```ts
// src/actions/leads.ts:31-33
const lead = await tenantPrisma.lead.create({
    data: validated,
});
```

   O regex Zod (`src/actions/leads.ts:14`, `/^\+?[1-9]\d{10,14}$/`) **aceita os dois formatos** — `+5511…` E `5511…` (o `+` é opcional). Então até um lead criado manualmente entra sem `+`, garantindo divergência com um contato `+55…`.

5. **Quinto call site:** `src/actions/contacts.ts:88-90` busca lead por `phone: contact.whatsapp` e `src/actions/contacts.ts:94-100` cria lead com `phone: contact.whatsapp` cru:

```ts
// src/actions/contacts.ts:88-90
let lead = await tenantPrisma.lead.findFirst({
    where: { phone: contact.whatsapp },
});
```

   É o **único** caminho que mantém os dois lados alinhados (copia o telefone do contato para o lead, então casam por construção) — mas só funciona para contatos que **já estão** no banco, e não corrige os contatos crus gravados pelo worker/N8N.

O bug **não vive em `normalizePhone`** — esse helper é puro e perfeitamente testável. Ele vive na **where-clause inline** do Prisma. A decisão de produto "esses dois telefones casam?" é o **fato mais importante da interface** dessas funções, e está **escondida e duplicada** em cinco lugares. É uma armadilha clássica de localidade: o pedaço fácil de testar (normalizar string) tem teste; o pedaço que quebra em produção (o match) **não tem módulo nem teste**.

**Causa raiz**

Um único conceito — "identidade de telefone" — está **espalhado em N lugares** e materializado em **três formatos incompatíveis** (dígitos puros para dedup; `+55…` para import; cru para escrita manual/worker). Não existe um módulo cujo **teste de deleção** justifique sua existência: se apagássemos `normalizePhone`, a complexidade de "como casar telefones" **não desapareceria** — ela já está reaparecendo, dispersa, nos cinco call sites. A interface das funções de leitura (`getMessageHistoryByLead`, `getChatHistoryByLead`) **esconde** que o resultado depende de uma coincidência de formatação entre duas tabelas escritas por caminhos diferentes.

A **costura errada** está exposta hoje: os testes (`src/actions/message-history.test.ts:60` e `:102`) stubam o `whatsAppContact.findFirst` retornando um contato canned **independentemente da where-clause** — ou seja, eles cruzam a costura *passando por dentro* da decisão de match, então o bug é estruturalmente **inalcançável pelos testes atuais**.

**Impacto / bug observável**

Bug **ao vivo**, severidade alta:

- Usuário abre um lead que **tem** histórico de conversa no banco (gravado pelo worker como `+55…`, ou pelo N8N como `5511…`) e vê **"Nenhuma mensagem"** porque o `phone` do lead está em formato diferente do `whatsapp` do contato.
- Pior caso reverso: o worker grava um **contato duplicado** a cada formato novo de número, fragmentando o histórico (`src/lib/worker.ts:231`). O mesmo cliente vira N contatos, cada um com um pedaço da conversa.
- Dedup de import "funciona por sorte" (compara dígitos puros), mascarando o problema na importação enquanto a leitura quebra.

**Solução técnica detalhada**

Criar um módulo profundo de identidade de telefone e roteá-lo nos cinco call sites, aplicando **na escrita também** — normalizar só a leitura ainda perderia os contatos gravados crus pelo worker/N8N.

1. **Criar `src/lib/phone.ts`** com a interface abaixo (assinaturas sugeridas):

```ts
/**
 * Forma canônica única armazenada e comparada: E.164 simplificado para BR.
 * Ex.: "(11) 99999-9999", "5511999999999", "+55 11 99999-9999" → "+5511999999999"
 */
export function canonicalizePhone(raw: string): string;

/**
 * True se dois telefones representam o mesmo número, independente de formatação.
 * Equivale a canonicalizePhone(a) === canonicalizePhone(b).
 */
export function samePhone(a: string, b: string): boolean;

/**
 * Busca o WhatsAppContact cujo telefone canônico casa com `phone`.
 * Encapsula a decisão de match — nenhum chamador escreve where { whatsapp } na mão.
 */
export function findContactByPhone(
    tenantPrisma: ReturnType<typeof import("@/lib/prisma").getTenantPrisma>,
    phone: string
): Promise<WhatsAppContact | null>;

/**
 * Busca o Lead cujo telefone canônico casa com `phone`.
 */
export function findLeadByPhone(
    tenantPrisma: ReturnType<typeof import("@/lib/prisma").getTenantPrisma>,
    phone: string
): Promise<Lead | null>;
```

   A implementação de `canonicalizePhone` herda a lógica de `normalizePhone` (`src/actions/leads.ts:246-267`), que então é **removida** do arquivo de import e passa a chamar `canonicalizePhone`. A profundidade está em `findContactByPhone`/`findLeadByPhone`: muito comportamento (canonicalizar + consultar pela coluna canônica) atrás de uma interface de **um argumento de telefone**.

2. **Persistir a forma canônica (abordagem recomendada — ver "Riscos & migração").** Adicionar coluna `phoneNormalized` indexada em `Lead` e `WhatsAppContact`. O match passa a ser `where: { phoneNormalized: canonicalizePhone(phone) }`, que é **determinístico e indexado** — Prisma não normaliza dentro do `where`, então a comparação precisa de uma coluna já normalizada.

3. **Aplicar na ESCRITA.** Todo ponto que cria `Lead` ou `WhatsAppContact` passa a preencher `phoneNormalized`:

   - `createLead` — `src/actions/leads.ts:31-33`:

   ```ts
   // ANTES
   const lead = await tenantPrisma.lead.create({ data: validated });

   // DEPOIS
   const lead = await tenantPrisma.lead.create({
       data: { ...validated, phoneNormalized: canonicalizePhone(validated.phone) },
   });
   ```

   - `importLeadsFromCSV` — usa o `canonicalizePhone` para `phone` e `phoneNormalized`, e a dedup passa a comparar **forma canônica** em vez de dígitos puros (`src/actions/leads.ts:326,347,360,366`).

   - `persistOutboundMessageAudit` — `src/lib/worker.ts:226-239`:

   ```ts
   // ANTES
   let contact = await tenantPrisma.whatsAppContact.findFirst({
       where: { whatsapp: message.phone },
   });
   if (!contact) {
       contact = await tenantPrisma.whatsAppContact.create({
           data: { whatsapp: message.phone, name: message.name, createdAt: new Date(), isManual: false },
       });
   }

   // DEPOIS
   const canonical = canonicalizePhone(message.phone);
   let contact = await findContactByPhone(tenantPrisma, message.phone);
   if (!contact) {
       contact = await tenantPrisma.whatsAppContact.create({
           data: { whatsapp: canonical, phoneNormalized: canonical, name: message.name, createdAt: new Date(), isManual: false },
       });
   }
   ```

   - `syncContactToLead` — `src/actions/contacts.ts:88-100`: usa `findLeadByPhone(tenantPrisma, contact.whatsapp)` e, ao criar, preenche `phoneNormalized: canonicalizePhone(contact.whatsapp)`.

4. **Aplicar na LEITURA.** Substituir as where-clauses inline pelo módulo:

   - `src/actions/message-history.ts:72-74`:

   ```ts
   // ANTES
   const contact = await tenantPrisma.whatsAppContact.findFirst({ where: { whatsapp: phone } });
   // DEPOIS
   const contact = await findContactByPhone(tenantPrisma, phone);
   ```

   - `src/actions/chat.ts:65-67`: idem, `findContactByPhone(tenantPrisma, lead.phone)`.

5. **Centralizar a normalização do regex.** Manter o regex Zod (`src/actions/leads.ts:14`) como **validação de formato bruto**, mas garantir que o valor persistido sempre passe por `canonicalizePhone`. (Não relaxar nem endurecer o regex neste sprint — ver "Nota de verificação".)

**Arquivos afetados**

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/lib/phone.ts` | **novo** | `canonicalizePhone`, `samePhone`, `findContactByPhone`, `findLeadByPhone`. Dono único da identidade de telefone. |
| `src/lib/phone.test.ts` | **novo** | Testes unitários de canonicalização + testes de match com prisma stub. |
| `prisma/schema.prisma` | editar | Adiciona `phoneNormalized String?` + `@@index([phoneNormalized])` em `Lead` (`:63-87`) e `WhatsAppContact` (`:174-189`). |
| `src/actions/leads.ts` | editar | `createLead` (`:31`) e `importLeadsFromCSV` (`:326,346-378`) preenchem `phoneNormalized`; dedup compara forma canônica; `normalizePhone` (`:246-267`) delega para `canonicalizePhone`. |
| `src/actions/message-history.ts` | editar | `getMessagesFromDatabase` (`:72`) usa `findContactByPhone`. |
| `src/actions/chat.ts` | editar | `getChatHistoryByLead` (`:65`) usa `findContactByPhone`. |
| `src/lib/worker.ts` | editar | `persistOutboundMessageAudit` (`:226-239`) usa `findContactByPhone` e grava `phoneNormalized` canônico. |
| `src/actions/contacts.ts` | editar | `syncContactToLead` (`:88-100`) usa `findLeadByPhone` e grava `phoneNormalized`. |
| `scripts/backfill-phone-normalized.ts` | **novo** | Backfill por tenant: recalcula `phoneNormalized` de leads/contatos legados. |
| `src/actions/message-history.test.ts` | editar | Deixa de stubar a where-clause; passa a exercitar a costura real via `findContactByPhone`. |

**Plano de testes**

Tabela de canonicalização (`src/lib/phone.test.ts`):

| Entrada | `canonicalizePhone` (saída esperada) |
|---|---|
| `"+5511999999999"` | `"+5511999999999"` |
| `"5511999999999"` | `"+5511999999999"` |
| `"(11) 99999-9999"` | `"+5511999999999"` |
| `"11999999999"` | `"+5511999999999"` |
| `"+55 11 99999-9999"` | `"+5511999999999"` |
| `"55 11 9999-9999"` (fixo, 10 díg.) | `"+551199999999"` |

Tabela de match (`samePhone` / `findContactByPhone`):

| Lead `phone` | Contact `whatsapp` | `samePhone` |
|---|---|---|
| `"+5511999999999"` | `"5511999999999"` | `true` (hoje retorna `false` → bug) |
| `"+5511999999999"` | `"(11) 99999-9999"` | `true` |
| `"+5511999999999"` | `"+5511888888888"` | `false` |

Testes de costura nova, **sem os mocks atuais**: hoje `src/actions/message-history.test.ts:60,102` stubam `whatsAppContact.findFirst` retornando um contato canned, cruzando a costura por dentro da decisão de match. Depois da refatoração, o teste injeta um `findMany` que retorna contatos com `phoneNormalized` distintos e verifica que `findContactByPhone` **escolhe o certo** — a decisão de match passa a ser observável na borda do módulo. Caso de regressão obrigatório: lead `+5511999999999` + contato gravado como `5511999999999` deve retornar as mensagens (prova do bug corrigido).

Casos de escrita: `createLead` com `"5511999999999"` deve persistir `phoneNormalized = "+5511999999999"`; `persistOutboundMessageAudit` chamado duas vezes com `"5511999999999"` e `"+55 11 99999-9999"` deve resolver para **um único** contato (não duplicar).

**Riscos & migração**

Duas abordagens avaliadas:

- **(A) Persistir coluna canônica `phoneNormalized` indexada + backfill** — recomendada. Match vira lookup indexado determinístico; não depende de o `phone`/`whatsapp` original mudar de formato (preserva o valor exibido cru). Custo: migração de schema + backfill.
- **(B) Normalizar a coluna existente na escrita + migração reescrevendo linhas legadas** — mais simples (sem coluna nova), mas **reescreve `whatsapp`/`phone` originais**, perdendo o formato como o cliente digitou, e ainda exige migração de dados. Risco maior em dados legados ambíguos.

**Recomendação: abordagem (A).** Mantém o dado original intacto e isola a forma de match numa coluna dedicada e indexada.

**Script de backfill** (`scripts/backfill-phone-normalized.ts`):
1. Para cada tenant (iterar `crmUser` com `databaseUrl != null`, como em `src/lib/worker.ts:288-304`), abrir `getTenantPrisma`.
2. `lead.findMany({ select: { id, phone } })` → para cada, `update({ where:{id}, data:{ phoneNormalized: canonicalizePhone(phone) } })` em lotes.
3. Idem para `whatsAppContact` (pular `whatsapp == null`).
4. Detectar **colisões** pós-canonicalização em `WhatsAppContact` (vários contatos → mesmo `phoneNormalized`): logar para merge manual de histórico; **não** mesclar automaticamente neste sprint.

**Ordem de deploy:** (1) migração de schema adicionando coluna nullable + índice; (2) deploy do código que **escreve** `phoneNormalized` e **lê** com fallback (se coluna vazia, cair para o match antigo por `whatsapp`); (3) rodar backfill; (4) remover o fallback de leitura. Coluna nullable evita downtime e mantém compatibilidade durante a janela de backfill.

**Critérios de aceite**

- [ ] `src/lib/phone.ts` criado com `canonicalizePhone`, `samePhone`, `findContactByPhone`, `findLeadByPhone`.
- [ ] `normalizePhone` em `leads.ts` removido ou delegando para `canonicalizePhone` (zero duplicação de lógica de normalização).
- [ ] `phoneNormalized` adicionado e indexado em `Lead` e `WhatsAppContact` no schema.
- [ ] Os 5 call sites (`leads.ts:31`, `leads.ts:326`, `message-history.ts:72`, `chat.ts:65`, `worker.ts:226`, `contacts.ts:88`) roteados pelo módulo.
- [ ] Escrita preenche `phoneNormalized` em `createLead`, `importLeadsFromCSV`, `persistOutboundMessageAudit`, `syncContactToLead`.
- [ ] Script de backfill executado e idempotente; colisões logadas.
- [ ] Teste de regressão do bug ao vivo (lead `+55…` + contato cru) passa e retorna o histórico.
- [ ] `message-history.test.ts` não stuba mais a where-clause; cruza a costura real.

## Ordem de execução

1. Criar `src/lib/phone.ts` (`canonicalizePhone` + `samePhone`) e `src/lib/phone.test.ts` com a tabela de canonicalização — TDD, sem tocar em banco.
2. Migração de schema: `phoneNormalized` nullable + índice em `Lead` e `WhatsAppContact`.
3. Implementar `findContactByPhone` / `findLeadByPhone` com fallback (coluna vazia → match antigo).
4. Rotear as **escritas** (`createLead`, `importLeadsFromCSV`, `persistOutboundMessageAudit`, `syncContactToLead`).
5. Rotear as **leituras** (`message-history.ts`, `chat.ts`) e remover `normalizePhone` duplicado.
6. Escrever o script de backfill e rodá-lo por tenant; revisar log de colisões.
7. Atualizar `message-history.test.ts` para cruzar a costura real; adicionar teste de regressão do bug.
8. Remover o fallback de leitura após o backfill confirmado.

## Nota de verificação

A verificação adversarial **confirmou** o bug ao vivo: os cinco call sites existem nas linhas citadas, o `normalizePhone` só é usado no import (`leads.ts:346`), o regex Zod (`leads.ts:14`) torna o `+` opcional e o worker grava telefone cru (`worker.ts:233`) — todos os ingredientes da divergência de formato estão presentes, e os testes atuais (`message-history.test.ts:60,102`) realmente stubam por dentro da costura, escondendo o defeito. Severidade alta mantida. **Ressalvas para calibrar confiança:** (1) `canonicalizePhone` deve ser conservadora — assumir BR como `normalizePhone` faz hoje é aceitável para este sprint, mas internacionalização robusta (DDI ≠ 55) fica para depois; não é costura prematura embutir o país agora porque já é o comportamento vigente. (2) **NÃO** mesclar contatos duplicados automaticamente no backfill — merge de histórico é decisão de produto e arrisca corromper conversas; apenas logar. (3) Não relaxar nem endurecer o regex de validação neste sprint: o objetivo é centralizar o **match**, não mudar o contrato de validação de entrada — alterá-lo agora seria escopo extra e risco desnecessário.
