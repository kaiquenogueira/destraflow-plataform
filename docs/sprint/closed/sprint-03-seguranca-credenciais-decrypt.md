# Sprint 03 — Segurança de credenciais (decrypt) e cache de conexão de tenant

> - **Prioridade:** Alta
> - **Complexidade:** Baixa–Média
> - **Esforço estimado:** 2–3 dias
> - **Dependências:** Nenhuma
> - **Subsistemas:** Criptografia de dados (`encryption`), Resolução de tenant (`tenant`/`prisma`), Worker de mensagens, Server actions de admin, Dashboard
> - **Status:** Concluído (2026-06-21, PR #15) — Opção B (keying por `tenantId`). Verificação de ciphertext em produção encontrou 1 `databaseUrl` em texto plano (tenant USER), remediado via `scripts/encrypt-plaintext-databaseurl.ts` antes de ativar `decryptSecret`; estado final 4/4 em ciphertext.

## Resumo executivo

A função `decrypt()` em `src/lib/encryption.ts` tem uma interface que sobrecarrega o retorno com três desfechos distintos (decifrado, passthrough verbatim e throw) e não permite ao chamador distinguir um valor que foi *de fato* decifrado de um valor repassado em texto plano. Como uma connection string Postgres real (`postgresql://user:pass@host:port/db`) contém vários `:`, ela cai no ramo `parts.length !== 3` e é **repassada verbatim** — indo direto para `new pg.Pool(...)`. Há um bug latente ao vivo: se um `databaseUrl` for gravado sem criptografia (ou corrompido para um formato com nº de `:` diferente de 3), o sistema abre um pool com a credencial NÃO criptografada em vez de falhar alto. Este sprint separa a política "credenciais devem ser ciphertext" em uma função estrita e testável, usada nos 4 sites de resolução de conexão, e (Ponto 2, estrutural) torna o cache LRU de `getTenantPrisma` observável e keyável por identidade estável, sem vendê-lo como bug de concorrência (não é).

## Pontos abordados

1. `decrypt()` repassa strings malformadas como texto plano → pool de DB com credencial não criptografada (severidade **Alta**, bug latente ao vivo).
2. `getTenantPrisma` esconde invariantes (keying, cap, LRU, `$disconnect`) atrás de uma interface de 1 linha (severidade **Baixa**, testabilidade/clareza — **não** é bug de concorrência).

---

### Ponto 1 — `decrypt()` repassa strings malformadas como texto plano

**Problema**

`src/lib/encryption.ts:48-77` implementa `decrypt(text)` como um **módulo raso com interface enganosa**: a assinatura é `(text: string) => string`, mas o retorno significa três coisas diferentes dependendo do formato da entrada, e o chamador não recebe sinal de qual aconteceu.

```ts
// src/lib/encryption.ts:48-57
export function decrypt(text: string): string {
  if (!text) return text;                       // (a) vazio -> verbatim

  // Se não tiver o formato esperado (iv:authTag:content), assume que não está criptografado
  // Isso permite migração gradual de dados legados
  if (!text.includes(":")) return text;         // (b) sem ":" -> verbatim

  try {
    const parts = text.split(":");
    if (parts.length !== 3) return text;         // (c) tem ":" mas != 3 partes -> verbatim
    // ...só aqui (3 partes) decifra de fato
```

```ts
// src/lib/encryption.ts:71-76
  } catch (error) {
    console.error("Decryption error:", error);
    // Melhor lançar erro para não usar lixo como connection string
    throw new Error("Falha ao descriptografar dados");
  }
```

O comentário em `:73-74` reconhece a intenção correta ("não usar lixo como connection string"), mas o ramo `(c)` em `:57` **viola exatamente isso**: uma URL Postgres real tem o shape `postgresql://user:pass@host:port/db` — múltiplos `:` → `parts.length > 3` → cai em `(c)` → retorna verbatim sem lançar.

Esta é uma **costura sensível a segredo se passando por costura segura**. O chamador cruza a interface acreditando "recebi um valor decifrado", quando pode ter recebido o input bruto de volta. Os 4 sites que resolvem conexão consomem o retorno direto:

```ts
// src/lib/tenant.ts:49,54 — getTenantContext
const databaseUrl = decrypt(user.databaseUrl);
// ...
tenantPrisma: getTenantPrisma(databaseUrl),
```

```ts
// src/lib/worker.ts:310-315 — processAllTenants
const databaseUrl = decrypt(user.databaseUrl);
const evolutionInstance = decrypt(user.evolutionInstance);
const evolutionApiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : null;
// ...
const tenantPrisma = getTenantPrisma(databaseUrl);
```

```ts
// src/lib/worker.ts:362-363 — updateCampaignStatuses
const databaseUrl = decrypt(user.databaseUrl);
const tenantPrisma = getTenantPrisma(databaseUrl);
```

```ts
// src/actions/admin.ts:223 — getUserNotifications
const tenantPrisma = getTenantPrisma(decrypt(user.databaseUrl));
```

```ts
// src/app/(dashboard)/dashboard/page.tsx:71-72 — getTenantDashboardData
const databaseUrl = decrypt(user.databaseUrl);
const tenantPrisma = getTenantPrisma(databaseUrl);
```

O passthrough é **intencional e vivo** para campos legados (`src/actions/admin.ts:84-86`, com o comentário "Descriptografar dados sensíveis para edição" e o `|| ""` para tolerar nulos), mas a política de tolerância está espalhada e não tem como ser ligada/desligada por chamador.

A cobertura de teste atual reforça o passthrough como *feature* sem cobrir o ramo perigoso `(c)`:

```ts
// src/lib/encryption.test.ts:27-30
it("should return original text if format is invalid (legacy support)", () => {
    const plainText = "texto-nao-criptografado";
    expect(decrypt(plainText)).toBe(plainText);
});
```

Esse teste exercita só o ramo `(b)` (string sem `:`). Não há nenhum teste para uma string com `:` que não divide em 3 partes — justamente o shape de uma URL Postgres. Aplicando o **teste de deleção**: se removêssemos a tolerância de `decrypt`, a complexidade NÃO sumiria, ela reapareceria nos campos legados — logo a tolerância tem valor, mas precisa ser **opt-in explícito**, não o default silencioso de todo chamador.

**Causa raiz**

Um único conceito — "este valor pode ser legado e portanto não ciphertext" — está embutido como comportamento default de `decrypt`, e a decisão de risco (abrir um pool com possível texto plano vs. falhar alto) é tomada *dentro* de uma função que não conhece o risco do chamador. A interface esconde o fato mais importante para a segurança: **se o valor foi decifrado ou não**. Os 4 sites de conexão herdam silenciosamente uma política pensada para o caso de edição/migração de admin.

**Impacto / bug observável**

Bug latente ao vivo, severidade Alta:

- Se algum `crmUser.databaseUrl` estiver gravado em texto plano (criação fora do fluxo `encrypt`, restore de backup legado, edição manual no banco, migração incompleta), `decrypt()` o repassa verbatim e `getTenantPrisma` abre um `pg.Pool` apontando para o banco do tenant **usando a credencial em claro como se nada estivesse errado**. Não há erro, não há log de alerta — o sistema "funciona", o que mascara a ausência de criptografia em repouso.
- Pior: se um valor ciphertext for truncado/corrompido para um nº de `:` ≠ 3 (ex.: perda do `authTag`), o ramo `(c)` o repassa verbatim em vez de lançar; `pg.Pool` então recebe uma string inválida e falha tarde, no momento da query, com um erro de conexão genérico difícil de diagnosticar — em vez de um erro claro de "credencial não está em formato ciphertext".

**Solução técnica detalhada**

Separar a política por risco do chamador. Introduzir uma função **estrita** para credenciais de conexão que retorna o valor decifrado OU lança alto, e manter a tolerância legada como opt-in explícito apenas para os campos que realmente precisam (`evolutionInstance`/`evolutionApiKey` no fluxo de admin).

1. Em `src/lib/encryption.ts`, classificar o formato em uma função pura e pequena:

```ts
// src/lib/encryption.ts (novo)
/** Retorna true se a string tem o shape iv:authTag:content (3 partes hex). */
export function isCiphertext(text: string): boolean {
  if (!text) return false;
  const parts = text.split(":");
  return parts.length === 3 && parts.every((p) => /^[0-9a-f]+$/i.test(p) && p.length > 0);
}
```

2. Adicionar a função **estrita**, sem passthrough, que é a única usada para credenciais de conexão:

```ts
// src/lib/encryption.ts (novo)
/**
 * Decifra um segredo que DEVE estar em ciphertext (iv:authTag:content).
 * Lança se o valor estiver vazio ou não for ciphertext — NUNCA repassa texto plano.
 * Use para credenciais que vão abrir conexões (databaseUrl).
 */
export function decryptSecret(text: string): string {
  if (!isCiphertext(text)) {
    throw new Error("Credencial não está em formato criptografado (esperado iv:authTag:content)");
  }
  return decryptCipher(text); // núcleo de decifragem; lança em chave/dado inválido
}
```

   Onde `decryptCipher` é o núcleo extraído de `decrypt` (linhas `:55-70` atuais), sem nenhum dos `return text` de passthrough — ele assume que já recebeu ciphertext válido e lança em falha de cripto (mantendo o `throw` de `:75`).

3. Manter `decrypt` como a versão **tolerante explicitamente opt-in**, com a semântica de hoje (passthrough para legado), mas documentada como "use apenas para campos em migração gradual, nunca para abrir conexão":

```ts
// src/lib/encryption.ts (refatorado)
/**
 * Decifra tolerando dados legados em texto plano (passthrough se não for ciphertext).
 * NÃO use para credenciais que abrem conexão — use decryptSecret.
 * Mantido para campos em migração gradual (evolutionInstance/evolutionApiKey, edição de admin).
 */
export function decrypt(text: string): string {
  if (!isCiphertext(text)) return text;   // (a)+(b)+(c) unificados: não-ciphertext = verbatim
  return decryptCipher(text);
}
```

4. Atualizar os **4 sites de resolução de conexão** para `decryptSecret` (ANTES → DEPOIS):

```ts
// src/lib/tenant.ts:49  ANTES
const databaseUrl = decrypt(user.databaseUrl);
// DEPOIS
import { decryptSecret } from "@/lib/encryption";
const databaseUrl = decryptSecret(user.databaseUrl);
```

```ts
// src/lib/worker.ts:310  ANTES
const databaseUrl = decrypt(user.databaseUrl);
// DEPOIS
const databaseUrl = decryptSecret(user.databaseUrl);

// src/lib/worker.ts:362  ANTES
const databaseUrl = decrypt(user.databaseUrl);
// DEPOIS
const databaseUrl = decryptSecret(user.databaseUrl);
```

```ts
// src/actions/admin.ts:223  ANTES
const tenantPrisma = getTenantPrisma(decrypt(user.databaseUrl));
// DEPOIS
const { decryptSecret } = await import("@/lib/encryption");
const tenantPrisma = getTenantPrisma(decryptSecret(user.databaseUrl));
```

```ts
// src/app/(dashboard)/dashboard/page.tsx:71  ANTES
const databaseUrl = decrypt(user.databaseUrl);
// DEPOIS
const databaseUrl = decryptSecret(user.databaseUrl);
```

   Observação sobre `worker.ts:311-312`: `evolutionInstance`/`evolutionApiKey` **permanecem** com `decrypt` (tolerante) — são exatamente os campos legados em migração. O mesmo vale para `admin.ts:85-86` e para `dashboard.page.tsx:142-143` (`WhatsAppStatusCard`).

5. Resultado: a política "credenciais de conexão devem ser ciphertext" passa a ser **enforced em 1 função** (`decryptSecret`) e testável diretamente cruzando sua interface — rejeitar `databaseUrl` não-ciphertext **antes** de abrir o pool, em vez de espalhar a decisão por 5 arquivos.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
| --- | --- | --- |
| `src/lib/encryption.ts` | editar | Extrair `decryptCipher` (núcleo); adicionar `isCiphertext` e `decryptSecret`; reescrever `decrypt` em termos de `isCiphertext` (sem mudar a semântica tolerante) |
| `src/lib/tenant.ts` | editar | `:49` `decrypt` → `decryptSecret` |
| `src/lib/worker.ts` | editar | `:310` e `:362` `decrypt` → `decryptSecret`; `:311-312` mantêm `decrypt` |
| `src/actions/admin.ts` | editar | `:223` `decrypt` → `decryptSecret`; `:84-86` mantêm `decrypt` |
| `src/app/(dashboard)/dashboard/page.tsx` | editar | `:71` `decrypt` → `decryptSecret`; `:142-143` mantêm `decrypt` |
| `src/lib/encryption.test.ts` | editar | Adicionar casos para `isCiphertext` e `decryptSecret` (ver Plano de testes) |

**Plano de testes**

Adicionar a `src/lib/encryption.test.ts`. A nova costura (`decryptSecret`) é testável **diretamente** — não precisa de mock de `pg.Pool` nem de `getTenantPrisma`.

`isCiphertext(input) → boolean`:

| Input | Esperado | Motivo |
| --- | --- | --- |
| `""` | `false` | vazio |
| `"texto-sem-dois-pontos"` | `false` | sem `:` (legado) |
| `"postgresql://u:p@h:5432/db"` | `false` | múltiplos `:`, não-hex → não ciphertext |
| `"aabb:ccdd:eeff"` | `true` | 3 partes hex |
| `"aabb:ccdd"` | `false` | só 2 partes (authTag perdido) |
| `encrypt("x")` | `true` | saída real do `encrypt` |

`decryptSecret(input) → string | throws`:

| Input | Esperado |
| --- | --- |
| `encrypt("postgresql://u:p@h:5432/db")` | retorna a URL original |
| `"postgresql://u:p@h:5432/db"` (texto plano) | **lança** "não está em formato criptografado" |
| `""` | **lança** |
| `"aabb:ccdd:eeff"` (hex válido, chave errada) | **lança** (falha de cripto, vinda de `decryptCipher`) |

`decrypt(input)` (regressão — semântica tolerante preservada):

| Input | Esperado |
| --- | --- |
| `""` | `""` (mantém `:23-25`) |
| `"texto-nao-criptografado"` | verbatim (mantém `:27-30`) |
| `"postgresql://u:p@h:5432/db"` | verbatim (ramo `(c)`, agora documentado) |
| `encrypt("x")` | `"x"` |

Antes da refatoração, o ramo `(c)` (URL Postgres) não tinha teste algum; depois, ele fica coberto tanto pelo passthrough documentado em `decrypt` quanto pela rejeição em `decryptSecret`.

**Riscos & migração**

- **Compatibilidade de dados:** se existir QUALQUER `crmUser.databaseUrl` gravado em texto plano hoje, a troca para `decryptSecret` fará o `getTenantContext`/worker/dashboard **lançar** em vez de abrir o pool — comportamento correto, mas que pode quebrar tenants que estavam "funcionando por acidente". Antes do deploy, rodar um script de verificação:

  ```ts
  // scripts/check-databaseurl-ciphertext.ts (one-off)
  // Lê todos os crmUser com databaseUrl != null e reporta os que NÃO passam em isCiphertext.
  // NÃO decifra nem loga o valor; reporta apenas { id, email, ok: boolean }.
  ```

  Para os reprovados, re-gravar via fluxo de admin (`updateUser` em `admin.ts:150-152` já chama `encrypt`) ou backfill: `encrypt(plaintext)` e `update`. Só então fazer o deploy do `decryptSecret`.
- **Ordem de deploy:** (1) merge de `isCiphertext`/`decryptSecret`/`decrypt` refatorado (não muda comportamento dos chamadores ainda); (2) rodar o script de verificação em produção; (3) backfill dos reprovados; (4) merge da troca dos 4 sites para `decryptSecret`.
- **Campos Evolution:** intencionalmente **não** migram para `decryptSecret` neste sprint — permanecem tolerantes. Não há regressão para eles.

**Critérios de aceite**

- [ ] `isCiphertext` e `decryptSecret` existem em `src/lib/encryption.ts` com testes cobrindo a tabela acima.
- [ ] `decrypt` mantém a semântica tolerante atual (testes de regressão `:22-30` passam) e está documentado como opt-in legado.
- [ ] Os 4 sites de conexão (`tenant.ts:49`, `worker.ts:310`, `worker.ts:362`, `admin.ts:223`, `dashboard/page.tsx:71`) usam `decryptSecret`.
- [ ] Os campos Evolution (`worker.ts:311-312`, `admin.ts:85-86`, `dashboard/page.tsx:142-143`) seguem usando `decrypt`.
- [ ] Script de verificação executado em produção e backfill concluído antes do deploy da troca.
- [ ] `decryptSecret` lança (testado) ao receber uma URL Postgres em texto plano — nenhum pool é aberto com não-ciphertext.

---

### Ponto 2 — `getTenantPrisma` esconde invariantes atrás de interface de 1 linha

**Problema**

`src/lib/prisma.ts:51-77` expõe `getTenantPrisma(databaseUrl: string): TenantPrismaClient` — uma assinatura de 1 linha — mas a **interface real** (tudo que o chamador/mantenedor precisa saber) tem quatro invariantes invisíveis na assinatura:

```ts
// src/lib/prisma.ts:43-45
const tenantClients = new Map<string, TenantPrismaClient>();
const MAX_TENANT_CLIENTS = 10;
```

```ts
// src/lib/prisma.ts:51-77
export function getTenantPrisma(databaseUrl: string): TenantPrismaClient {
  if (tenantClients.has(databaseUrl)) {          // (1) keyed pela STRING CRUA decifrada
    const client = tenantClients.get(databaseUrl)!;
    tenantClients.delete(databaseUrl);           // (3) reordenação LRU
    tenantClients.set(databaseUrl, client);
    return client;
  }
  if (tenantClients.size >= MAX_TENANT_CLIENTS) { // (2) cap = 10
    const oldestKey = tenantClients.keys().next().value;
    if (oldestKey) {
      const clientToRemove = tenantClients.get(oldestKey);
      clientToRemove?.$disconnect().catch(...);   // (4) $disconnect fire-and-forget na evicção
      tenantClients.delete(oldestKey);
    }
  }
  const client = createTenantPrismaClient(databaseUrl);
  tenantClients.set(databaseUrl, client);
  return client;
}
```

Invariantes escondidas:

1. **Keying pela string crua decifrada:** duas URLs equivalentes que diferam por query param, barra final ou ordem de parâmetros viram **pools separados** — silenciosamente desperdiçando uma das 10 vagas do cache.
2. **Cap `MAX_TENANT_CLIENTS = 10`** (`:45`), invisível para o chamador.
3. **Evicção LRU** (reordenação em `:55-56`, evicção do mais antigo em `:62`).
4. **`$disconnect` fire-and-forget** na evicção (`:66-68`) — o pool antigo é desconectado sem aguardar.

Este é um **módulo raso**: a interface (uma string → um client) é quase tão simples quanto trivial, mas o comportamento relevante está todo em estado module-global (`tenantClients`, `:44`). Para testar qualquer uma das 4 invariantes hoje é preciso **inspecionar o `Map` module-global** — ou seja, testar *passando da* costura, sintoma de formato errado. Não há nenhum teste em `prisma.ts`; `tenant.test.ts` e `worker.test.ts` **mockam** `getTenantPrisma`, então o comportamento real do cache nunca é exercitado.

**Causa raiz**

A função expõe "me dê um client para esta URL" mas a interface real é "gerencio um cache LRU de N pools keyado por X com política de evicção Y e teardown Z" — e nada disso atravessa a assinatura. O fato mais importante para correção (qual é a chave de identidade e quando um pool é destruído) está implícito.

**Impacto / bug observável**

Estrutural, severidade Baixa. **Não há bug de concorrência** (ver Nota de verificação). Sintomas:

- Cache miss espúrio quando o mesmo tenant é resolvido por URLs textualmente diferentes mas semanticamente iguais → pools duplicados ocupando vagas → evicções mais frequentes que o necessário sob 11+ tenants distintos no dashboard. Degradação de performance, não corretude.
- Impossível escrever um teste de unidade da política de evicção sem reach-in no `Map` global.

**Solução técnica detalhada**

1. **Keyar por identidade estável.** Em sinergia com o Ponto 1, fazer `getTenantPrisma` deixar de receber a string crua. Duas opções (recomenda-se a **B**):

   - **A — normalizar a URL:** `key = normalizeConnectionString(url)` (parse via `new URL`, dropar barra final, ordenar query params). Mantém a assinatura por string mas estabiliza a chave.
   - **B (recomendada) — receber o valor CRIPTOGRAFADO ou o usuário** e fazer a decifragem dentro, de modo que a invariante "nunca abrir pool de ciphertext" fique **inesquecível por construção** e a chave de cache seja o `id` do tenant (identidade verdadeiramente estável):

   ```ts
   // src/lib/prisma.ts (shape proposto — opção B)
   interface TenantConnection {
     tenantId: string;          // chave de cache estável (não a URL)
     encryptedUrl: string;      // ciphertext; decifrado internamente via decryptSecret
   }

   export function getTenantPrisma(conn: TenantConnection): TenantPrismaClient {
     // key = conn.tenantId  (não a URL crua)
     // decryptSecret(conn.encryptedUrl) só quando há cache miss, imediatamente antes de createTenantPrismaClient
   }
   ```

   Assim, o chamador nunca tem chance de passar uma string já decifrada-ou-repassada (fechando o vetor do Ponto 1 por design), e URLs equivalentes deixam de gerar pools separados porque a chave é o `tenantId`.

2. **Tornar capacidade/evicção/`$disconnect` observáveis** para testar pela própria função, sem reach-in no Map. Expor o cache como um objeto com métodos de inspeção, ou aceitar dependências injetáveis:

   ```ts
   // src/lib/tenant-pool.ts (novo) — extrair o cache LRU para um módulo com interface explícita
   export interface TenantPoolCache {
     get(tenantId: string): TenantPrismaClient | undefined;
     getOrCreate(conn: TenantConnection): TenantPrismaClient;
     size(): number;                 // observável: capacidade atual
     has(tenantId: string): boolean; // observável: hit/miss sem reach-in
     readonly capacity: number;      // MAX_TENANT_CLIENTS exposto
   }

   export function createTenantPoolCache(opts?: {
     capacity?: number;                                   // default 10
     create?: (url: string) => TenantPrismaClient;        // injeção p/ teste (sem pg real)
     onEvict?: (client: TenantPrismaClient) => void;      // observável: evicção/disconnect
   }): TenantPoolCache;
   ```

   `getTenantPrisma` passa a delegar para uma instância module-global desse cache. Agora a evicção LRU, o cap e o `onEvict` (que faz o `$disconnect`) são testáveis injetando `create` falso e contando chamadas de `onEvict` — **cruzando a interface**, sem inspecionar `Map` interno.

3. Atualizar os 5 call sites para a nova assinatura (B): em vez de `getTenantPrisma(decryptSecret(user.databaseUrl))`, passar `getTenantPrisma({ tenantId: user.id, encryptedUrl: user.databaseUrl })`. Isso exige que cada site selecione `id` no `findUnique`/`findMany` (já presente em `tenant.ts:31`, `worker.ts:295`; adicionar onde faltar).

   > Se a opção B for considerada escopo grande demais para este sprint, a opção A (normalizar a chave) já elimina o cache miss espúrio com mudança mínima — mas perde a sinergia de segurança com o Ponto 1. Recomendação: B.

**Arquivos afetados**

| Arquivo | Ação | O que muda |
| --- | --- | --- |
| `src/lib/tenant-pool.ts` | novo | Cache LRU extraído com interface `TenantPoolCache` observável e injetável |
| `src/lib/prisma.ts` | editar | `getTenantPrisma` delega ao novo cache; recebe `TenantConnection` (opção B) ou URL normalizada (opção A); `tenantClients`/`MAX_TENANT_CLIENTS` saem para `tenant-pool.ts` |
| `src/lib/prisma.test.ts` | novo | Testes da política LRU/cap/evicção via interface |
| `src/lib/tenant.ts` | editar | Site `:54` passa `{ tenantId, encryptedUrl }` (opção B) |
| `src/lib/worker.ts` | editar | Sites `:315` e `:363` idem |
| `src/actions/admin.ts` | editar | Site `:223` idem |
| `src/app/(dashboard)/dashboard/page.tsx` | editar | Site `:72` idem |

**Plano de testes**

Novo `src/lib/prisma.test.ts` (ou `tenant-pool.test.ts`) com `create` e `onEvict` injetados — **sem `pg` real e sem mockar `getTenantPrisma`**:

| Cenário | Ação | Esperado |
| --- | --- | --- |
| Cache hit por id | `getOrCreate(t1)` 2x | `create` chamado 1x; `size()===1` |
| Identidade estável | `getOrCreate({id:"t1",url:"...?a=1"})` e depois `...?a=1&`/barra | `create` chamado 1x (opção B: mesma `tenantId`) |
| Cap respeitado | inserir 11 ids distintos, `capacity=10` | `size()===10` |
| Evicção LRU | inserir t1..t10, tocar t1, inserir t11 | evicta t2 (LRU), `onEvict` chamado para t2 |
| Teardown na evicção | item evictado | `onEvict(clientEvictado)` chamado exatamente 1x |

`tenant.test.ts`/`worker.test.ts` podem **parar de mockar** `getTenantPrisma` para a parte de cache, ou mantê-lo mockado para isolar lógica de negócio — mas o cache em si agora tem cobertura própria cruzando sua interface.

**Riscos & migração**

- Mudança de assinatura de `getTenantPrisma` toca 5 call sites — fazer junto com a troca do Ponto 1 (mesmos sites). Sem dados a migrar.
- A chave de cache muda de URL para `tenantId`: se dois tenants compartilhassem a MESMA `databaseUrl` (improvável em multi-tenant por banco), passariam a ter pools separados — comportamento correto e mais previsível.
- `$disconnect` continua fire-and-forget (via `onEvict`); nenhuma mudança de semântica de teardown, apenas de observabilidade.

**Critérios de aceite**

- [ ] Cache LRU extraído para `src/lib/tenant-pool.ts` com interface `TenantPoolCache` observável (`size`, `has`, `capacity`, `onEvict`).
- [ ] `getTenantPrisma` keya por identidade estável (`tenantId` na opção B, ou URL normalizada na A).
- [ ] Testes de cap/LRU/evicção/teardown passam injetando `create`/`onEvict`, sem reach-in no `Map` e sem mockar `getTenantPrisma`.
- [ ] Os 5 call sites atualizados para a nova assinatura.
- [ ] Documentação do módulo deixa explícitas as 4 invariantes (keying, cap, LRU, teardown).

---

## Ordem de execução

1. **Ponto 1, passos 1–3:** adicionar `isCiphertext`, `decryptSecret`, refatorar `decrypt` em `encryption.ts` + testes. (Sem mudar chamadores; seguro de mergear.)
2. **Verificação de dados:** rodar `scripts/check-databaseurl-ciphertext.ts` em produção; backfill dos `databaseUrl` em texto plano.
3. **Ponto 1, passo 4:** trocar os 4 sites de conexão para `decryptSecret`. (Depende do passo 2 estar concluído para não quebrar tenants legados.)
4. **Ponto 2, passos 1–2:** extrair `tenant-pool.ts`, keyar por identidade estável, expor observabilidade + `prisma.test.ts`.
5. **Ponto 2, passo 3:** atualizar os 5 call sites para a nova assinatura (B) — feito junto com o passo 3 acima, pois são os mesmos arquivos.

## Nota de verificação

A verificação adversarial **confirmou** o Ponto 1 e **elevou** sua severidade para Alta: uma connection string Postgres real tem múltiplos `:` e cai de fato no ramo `parts.length !== 3` (`encryption.ts:57`), sendo repassada verbatim para `getTenantPrisma`/`new pg.Pool` sem que o chamador perceba — o comentário em `:73-74` ("não usar lixo como connection string") só vale para o caminho `try/catch`, não para o ramo `(c)`. O passthrough é intencional e vivo (`admin.ts:84-86`, "migração gradual"), portanto a solução **não** remove a tolerância: separa em `decryptSecret` (estrito, para conexão) vs. `decrypt` (tolerante, opt-in para campos legados). Para o Ponto 2, a verificação **rebaixou** a severidade para Baixa e **refuta explicitamente** qualquer enquadramento como bug de concorrência: `MAX_CONCURRENT_TENANTS = 5` (`worker.ts:17`) é menor que `MAX_TENANT_CLIENTS = 10` (`prisma.ts:45`), então o worker nunca evicta um client em uso — o único gatilho real de evicção é tráfego concorrente de 11+ tenants distintos no dashboard, o que causa cache miss espúrio (performance), não corrupção. A recomendação de receber o valor criptografado em `getTenantPrisma` (opção B) é apresentada como sinergia de design, não como obrigatória; a opção A (normalizar a chave) é a alternativa de menor escopo caso B seja adiada — evitar costura prematura é uma escolha aceitável aqui.
