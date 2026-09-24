# S41-F7 · consumo da marca pelo site (P2-70)

## Origem e distribuição

D4 mantém os repositórios separados. A fundação foi integrada ao produtor
`plataformaencantrip-stack/ai-crm` na [PR #503](https://github.com/plataformaencantrip-stack/ai-crm/pull/503).
A preparação da distribuição foi integrada na
[PR #504](https://github.com/plataformaencantrip-stack/ai-crm/pull/504),
commit `e9199d9c984aeffdeeec73494b5c59b1f6b4405e`. A versão aprovada é
`@destraflow/brand@0.1.0`, publicada na release privada
[`brand-v0.1.0`](https://github.com/plataformaencantrip-stack/ai-crm/releases/tag/brand-v0.1.0).

O arquivo `vendor/destraflow-brand-0.1.0.tgz` foi baixado dessa release; seu
SHA-256 é `8aacc72cd70894fd84e949eb0ffbafff0a1d13555453b17f31ef08d59d2a5ab1`.
`scripts/check-brand-package.mjs` confere esse hash, a versão instalada e a
referência do lockfile. `npm ci` também confere a integridade SHA-512 do
artefato. O caminho `file:vendor/...` é interno ao checkout e não depende da
máquina de quem compila. A landing transpila o TypeScript do pacote com
`transpilePackages` e importa `tokens.css` diretamente; a ponte `@theme inline`
em `globals.css` gera as classes Tailwind dos tokens canônicos.

As primitivas de `@encantrip/ui` não são usadas na landing. Os controles do
funil já existem aqui; trazer o pacote de UI exigiria React e dependências de
domínio sem criar um único componente compartilhado necessário para F7. A
fronteira folha de `packages/brand` permanece intacta.

## Atualização e retorno

1. No produtor, altere a fonte, incremente a versão e passe pelos testes do
   pacote, régua de contraste e build do CRM. Integre a PR antes de gerar uma
   nova tag `brand-v<versão>` e anexar o `.tgz` com SHA-256 à release privada.
2. Neste repositório, baixe o artefato, confira o SHA-256 publicado, adicione-o
   a `vendor/`, atualize a referência exata em `package.json` e rode
   `npm install` para gravar o lockfile. Atualize o hash esperado no scanner e
   confira o preview antes de alterar a apresentação.
3. Rode `npm ci`, `npm run check:brand`, `npm run lint` e `npm run build` em
   checkout limpo. O CI executa a guarda antes do lint e do build.

Para voltar, reverta o commit de atualização da landing: ele restaura o
`package.json`, lockfile e arquivo da versão anterior. A release anterior
continua disponível; não apague o artefato antigo enquanto a versão nova não
for aceita. O CRM pode ser revertido independentemente. O deployment atual da
landing permanece até aceite final e validação desse retorno.

## Equivalência antes do redesenho

O preview F7 preservou as mesmas rotas, âncoras e componentes da landing. No
Chrome local, a home manteve o layout inicial, o destino de “Entrar” continuou
`https://crm.destraflow.com.br/login` e a seleção da primeira resposta do
funil avançou à etapa 2. Nenhum teste enviou dados a WhatsApp, calendário ou
webhook. O redirect `/termos-de-servico` → `/termos-de-uso` permanece no
`next.config.ts`. A F8 aplica a identidade depois deste ponto de comparação.

No produtor, `pnpm install --frozen-lockfile`, lint/typecheck/test do pacote
(16/16), `pnpm check:contrast` (72/72 AA) e build de `@encantrip/web`
passaram localmente. O job de CI da PR #504 não iniciou: o GitHub indicou
pagamento recente falhado ou limite de gastos da conta. Isso é limitação de
runner, não resultado de teste de código.
