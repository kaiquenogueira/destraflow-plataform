# S41-F8 · identidade Destraflow Tech na landing (P2-71)

## Sequência e fonte

A PR de fundação [#503](https://github.com/plataformaencantrip-stack/ai-crm/pull/503)
foi integrada antes da distribuição. A release privada
[`brand-v0.1.0`](https://github.com/plataformaencantrip-stack/ai-crm/releases/tag/brand-v0.1.0)
foi preparada pela PR [#504](https://github.com/plataformaencantrip-stack/ai-crm/pull/504),
e a landing passou a consumi-la na PR
[#51](https://github.com/kaiquenogueira/destraflow-plataform/pull/51).
Versão fixada: `@destraflow/brand@0.1.0`, SHA-256 do arquivo distribuído
`8aacc72cd70894fd84e949eb0ffbafff0a1d13555453b17f31ef08d59d2a5ab1`.
O procedimento de atualização e retorno está em
[s41-f7-consumo-da-marca.md](s41-f7-consumo-da-marca.md).
A identidade visual desta fatia está na PR
[#52](https://github.com/kaiquenogueira/destraflow-plataform/pull/52).

## Resultado contra a base

O inventário da F0 encontrou 301 ocorrências de cor fora da fonte em nove
arquivos da landing. O scanner `npm run check:ui` agora varre `src/**/*.{css,ts,tsx,svg}`
em CI e encontrou **zero** literais de cor na UI; os valores vêm de
`@destraflow/brand/tokens.css` pela ponte `@theme inline`. O scanner cobre
hex, funções de cor, cores utilitárias da paleta Tailwind e cores nomeadas em
declarações CSS. O arquivo da marca é conferido por SHA-256, versão e lockfile
em `npm run check:brand`.

Header, home, footer, FAQ, funil, páginas legais e OG usam a identidade
preto/dourado e a composição clara da marca. A prévia estática do Inbox traz
nomes fictícios e legenda explícita; não representa dados de clientes nem
resultados comerciais. A equipe e o FAQ continuam acessíveis. O botão
“Entrar” aponta para `https://crm.destraflow.com.br/login`.

As páginas legais mantêm o corpo anterior, razão social, CNPJ, contatos e
rotas públicas. Links de páginas legais para seções da home usam âncoras como
`/#solucao`. `/termos-de-servico` ainda redireciona para `/termos-de-uso`.
O aviso do funil esclarece que a equipe confirma o horário depois.

O host canônico é `https://destraflow.com.br`, vindo de `platformBrand.siteUrl`:
metadata, sitemap, robots, `llms.txt` e redirect do host `www` concordam com
ele. A metadata social usa `/api/og`, rota que gera a imagem 1200 × 630
inspecionada no preview, e robots permite essa imagem. Logo e ícone derivam do
símbolo da fonte; o favicon antigo foi retirado. `maximumScale: 1` saiu.

## Verificações antes da integração

- Checkout limpo do produtor, na tag `brand-v0.1.0`: instalação congelada,
  testes da marca (16/16), `pnpm check:contrast` (72/72 pares AA) e build do
  CRM passaram.
- Checkout limpo da branch F8: `npm ci`, `npm run check:brand`,
  `npm run check:ui`, `npm run lint` e `npm run build` passaram. A CI da PR #52
  e o preview Vercel passaram.
- Chrome: home desktop e 390 × 844, menu mobile, zoom real de 200%, âncoras e
  formulário; `scrollWidth` não ultrapassou a viewport. A volta no funil
  preservou dia, horário e contato digitados. Safari: zoom real de 200%, menu
  e avanço do formulário, sem barra horizontal. A apresentação em 390 × 844
  também foi conferida por captura.
- Em Chrome com toque emulado, menu, link para `/#faq` e primeira resposta do
  funil funcionaram; em 390 px, `scrollWidth` ficou em 390 px.
- `axe-core`, em Chrome, não encontrou violações WCAG A/AA na home em
  1440 × 900 e 390 × 844, na privacidade em 390 × 844 e nos termos em
  1440 × 900. Esta varredura não substitui a verificação manual de leitor de
  tela ou aparelho físico.
- Um navegador Chrome isolado percorreu as seis etapas com nome, e-mail e
  telefone sintéticos. `window.open` foi interceptado e toda requisição para
  fora de `localhost` foi bloqueada. Confirmou-se um lead no armazenamento
  local, a URL preparada do WhatsApp, o link de Google Agenda e o download ICS
  com horário e participante. **Zero requisições externas e nenhum envio a
  contato real.**
- No preview, o clique em “Entrar” chegou ao login do CRM com o mesmo símbolo,
  nome e paleta. Nenhuma credencial foi submetida.

O CI remoto do produtor continua sem iniciar steps por billing/limite de
gastos da conta GitHub; `P1-7` já registra essa pendência. Os gates do
produtor acima foram executados localmente em checkout limpo.

## Domínio e retorno

Antes da F8, `www.destraflow.com.br` respondia em produção, enquanto o apex
não tinha registro DNS. O apex foi adicionado ao projeto Vercel de produção;
no Cloudflare, um CNAME DNS only `@` aponta para o destino exigido pelo Vercel.
Vercel marca apex e `www` como configuração válida. Resolvedores públicos
`1.1.1.1` e `8.8.8.8` retornam os IPs do Vercel para o apex.

A PR #52 foi integrada em 24/09/2026 às 16:45 UTC, commit
`55a3b31103c1910179ee8a77bd20368f266dbd61`. O build do `main` e o
deployment de produção Vercel
[`4RDdS9rYh69GxzV3JWkAzXGfA2d9`](https://vercel.com/kaiquenogs-projects/destraflow-plataform/4RDdS9rYh69GxzV3JWkAzXGfA2d9)
passaram. A inspeção HTTPS do apex usou o endereço Vercel retornado pelo DNS
público com Host e SNI `destraflow.com.br`, pois o resolvedor do navegador
local ainda guardava a resposta negativa anterior à criação do registro.
O conteúdo veio do Vercel de produção com TLS válido.

- Home, `/api/og` (PNG), `/icon` (PNG), robots, sitemap, `llms.txt` e as quatro
  páginas legais responderam 200 no apex. `/termos-de-servico` respondeu 308
  para `/termos-de-uso`.
- `https://www.destraflow.com.br/politica-de-privacidade?x=1` respondeu 308
  para a mesma rota e query no apex.
- O HTML publicado traz título Destraflow Tech, canonical do apex e
  `og:image` em `https://destraflow.com.br/api/og`. Robots permite `/api/og`,
  e sitemap e `llms.txt` usam o mesmo host. O `llms.txt` mantém o destino do
  login `https://crm.destraflow.com.br/login`, que respondeu 200.

O retorno da F8 é reverter o commit da PR #52 no repositório da landing e
republicar a versão anterior; a PR #51 e o artefato `brand-v0.1.0` permanecem.
Se for necessário voltar também a F7, o procedimento versionado está no
documento da F7. O deployment anterior não foi removido.

Depois que o cache DNS local expirou, o Chrome abriu o apex em produção. O
clique em “Entrar” chegou a `https://crm.destraflow.com.br/login`, com o mesmo
símbolo, nome Destraflow Tech, composição clara e ação preta/dourada. Nenhuma
credencial foi inserida. O percurso autenticado dentro do CRM não foi
executado nesta fatia; pertence ao aceite integrado `P3-224`. A validação em
Safari de iPhone e Chrome de Android com toque físico fica como `P3-232` no
backlog do produtor. Nenhuma interação de teste enviou dados a contato real.
