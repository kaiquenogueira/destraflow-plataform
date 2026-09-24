# Destraflow Tech — Site institucional

Landing page e páginas legais da Destraflow Tech, hospedadas na Vercel. A identidade vem de `@destraflow/brand@0.1.0`; veja [docs/s41-f7-consumo-da-marca.md](docs/s41-f7-consumo-da-marca.md) para atualização e rollback da versão fixada.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Vercel (deploy)

## Desenvolvimento

```bash
npm ci
npm run check:brand
npm run check:ui
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Deploy na Vercel

1. Conecte o repositório ao projeto Vercel e configure os domínios `destraflow.com.br` e `www.destraflow.com.br`.
2. Configure `destraflow.com.br` como domínio primário. `www.destraflow.com.br` deve redirecionar permanentemente para ele, preservando caminho e query.
3. Antes do aceite em produção, confirme resolução DNS dos dois hosts, certificado TLS, canonical, sitemap, robots e retorno do login ao CRM.

## DNS na Cloudflare

Use os valores DNS exibidos pela Vercel para cada domínio. O registro de apex (`@`) também precisa existir: o código da landing e a fonte de marca definem `https://destraflow.com.br` como endereço canônico. Mantenha o proxy do Cloudflare desligado (DNS only) para os registros apontados à Vercel.

## Páginas

| Rota                       | Descrição                  |
|----------------------------|----------------------------|
| `/`                        | Landing page               |
| `/politica-de-privacidade` | Política de Privacidade    |
| `/termos-de-uso`           | Termos de Uso              |
| `/termos-de-servico`       | Redirect permanente → /termos-de-uso |
| `/exclusao-de-dados`       | Exclusão de Dados          |
| `/politica-de-reembolso`   | Política de Reembolso      |

## Placeholders

Os seguintes placeholders foram preenchidos com os dados do CNPJ:

| Placeholder | Valor |
|---|---|
| `[RAZÃO SOCIAL]` | Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA |
| `[CNPJ]` | 59.459.911/0001-24 |
| `[ENDEREÇO COMPLETO]` | Av. Paulista, 1106, Sala 01 Andar 16, Bela Vista, São Paulo - SP, CEP 01.310-914 |
| `[EMAIL DE CONTATO]` | contato@destraflow.com.br |
| `[EMAIL DE PRIVACIDADE]` | privacidade@destraflow.com.br |
| `[CIDADE/UF]` | São Paulo/SP |

Ainda pendente: nenhum — todos os placeholders preenchidos.

## Produto

O CRM em produção está em `https://crm.destraflow.com.br`. O botão "Entrar" aponta para o login do produto.
