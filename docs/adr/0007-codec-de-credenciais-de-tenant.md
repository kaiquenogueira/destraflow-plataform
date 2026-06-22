# 0007 — Codec de credenciais de tenant (encode/decode com dono único)

> - **Status:** Proposed
> - **Data:** 2026-06-22
> - **Decisores:** Equipe DestraFlow
> - **Relacionado:** [Sprint 09](../sprint/sprint-09-costuras-verificadas-pos-rescan.md), [ADR-0003](./0003-database-per-tenant.md), [ADR-0004](./0004-shared-evolution-server.md), [ADR-0005](./0005-rejected-premature-seams.md)

## Contexto

O trio de credenciais de um tenant no CRM DB — `databaseUrl`, `evolutionInstance`, `evolutionApiKey` — mais o `evolutionInstanceHash` (índice de busca exata derivado de `hashString(evolutionInstance)`) era encriptado/decriptado chamando as primitivas de `src/lib/encryption.ts` **inline**, espalhado por ações e Server Components: 3 sites de escrita (`admin.ts` create/update, `whatsapp.ts`) e 6 de leitura (`admin.ts`, `evolution-config.ts`, `worker.ts`, `dashboard/page.tsx`, `check_instance.ts`, e o pool em `prisma.ts`).

Nenhum módulo possuía três conhecimentos load-bearing:

1. **Qual é o conjunto de campos secretos** (e que `evolutionPhone` não entra nele).
2. **A invariante de pareamento `evolutionInstance` ↔ `evolutionInstanceHash`** — o hash deve ser escrito sempre junto com o ciphertext da instância. Essa invariante **já quebrou em produção**: existiam **dois** scripts (`backfill-hashes.ts`, `migrate-hashes.ts`) re-derivando o hash para consertar linhas com `evolutionInstance` setado e `evolutionInstanceHash` nulo.
3. **Qual modo de decrypt cada campo usa** — `decryptSecret` estrito para `databaseUrl` que abre conexão vs. `decrypt` tolerante para os demais. Esse conhecimento estava difuso: `tenant-sync.ts` abria conexão pg com `decrypt` **tolerante**, repassando uma `databaseUrl` em texto plano legado para uma conexão viva (mesmo vetor que o Sprint 03 fechou no pool principal).

## Decisão

Introduzir `src/lib/tenant-credentials.ts` como **dono único** do encode/decode das credenciais de tenant:

- `encryptTenantCredentials(input)` — emite só as chaves fornecidas (update parcial preservado) e **sempre pareia** `evolutionInstance` com `evolutionInstanceHash`. Esquecer o hash passa a ser impossível.
- `decryptTenantCredentials(user)` — decode tolerante para exibição/edição (forma do formulário admin; tudo string).
- `decryptEvolutionPair(user)` — decode tolerante do par Evolution para uso (`{ instanceName, apiKey? }`), o shape que `createEvolutionClient` espera.
- `rehashEncryptedInstance(encryptedInstance)` — único ponto que o script de reparo usa para re-derivar o hash.

Todos os sites de escrita e leitura passam pelo codec. **Toda** `databaseUrl` que abre conexão passa a usar `decryptSecret` estrito — `tenant-sync.ts` e os scripts de manutenção `migrate-tenants.ts` e `sync-tenants.ts` (este último também perde o `decrypt` hand-rolled tolerante e o log da connection string mascarada). Os dois scripts de reparo de hash colapsam em um só (`backfill-hashes.ts` via `rehashEncryptedInstance`).

### Por que isto NÃO é o "resolver de tenant gordo" rejeitado em ADR-0005 R1

[ADR-0005](./0005-rejected-premature-seams.md) R1 rejeita um módulo que recebe um `CrmUser` e retorna `{ tenantPrisma, evolutionClient, aiQuota }` num objeto só — porque **força over-fetch** (abrir pool LRU e/ou fazer chamada de rede que o caller não usa) e porque nenhum call site precisa dos três ao mesmo tempo.

O codec é **transformação pura de colunas**: não abre pool, não cria cliente Evolution, não faz rede. Cada caller continua decidindo *como usar* os valores decriptados (o admin form só preenche a UI; o worker abre o pool depois, via `getTenantPrisma`, só quando há trabalho). A complexidade real de conexão permanece **separada e intocada** em `decrypt`/`decryptSecret` (`encryption.ts`), `getTenantPrisma` (`prisma.ts`) e `createEvolutionClient` (`evolution.ts`). A decisão de decode **estrito** de `databaseUrl` que abre conexão continua no seam de conexão, fora do codec. Portanto R1 **não se aplica**: aqui há 2+ adaptadores reais (3 escritas + 6 leituras que re-derivavam o mesmo conjunto de campos) e o **teste de deleção** concentra complexidade. ADR-0003 e ADR-0004 **apoiam** o codec (credencial criptografada em repouso; instância+chave por tenant).

## Consequências

- A invariante instance↔hash tem dono único; adicionar um campo de credencial = 1 edição no codec.
- O vetor de `databaseUrl` em texto plano abrindo conexão via `tenant-sync` é fechado.
- Linhas legadas com plaintext em `evolutionInstance`/`evolutionApiKey` continuam lidas (decode tolerante). Uma `databaseUrl` legada em texto plano em `tenant-sync` passa a **falhar** o sync (intencional; rodar backfill de encriptação antes).
- Se um dia surgir necessidade de over-fetch combinado (pool + cliente + quota), isso é outra decisão — **não** reabre R1 por tabela; o codec permanece puro.
