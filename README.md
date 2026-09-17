# Destraflow — Site institucional

Landing page e páginas legais da Destraflow, hospedadas na Vercel.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Vercel (deploy)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Deploy na Vercel

1. Crie um projeto na Vercel conectado ao repositório.
2. Adicione o domínio `www.destraflow.com.br` nas configurações do projeto.
3. O domínio `destraflow.com.br` deve apontar para o deploy via redirect (ver DNS abaixo).

## DNS na Cloudflare

Configure os seguintes registros DNS para o domínio `destraflow.com.br`:

| Tipo | Nome  | Conteúdo              | Proxy |
|------|-------|-----------------------|-------|
| CNAME | www   | cname.vercel-dns.com  | DNS only (cinza) |
| A    | @     | 76.76.21.21           | DNS only (cinza) |

Na Vercel, adicione ambos os domínios (`destraflow.com.br` e `www.destraflow.com.br`). A Vercel faz o redirect automático de `destraflow.com.br` para `www.destraflow.com.br`.

> **Importante:** mantenha o proxy do Cloudflare desligado (DNS only) para os registros da Vercel, caso contrário o SSL pode conflitar.

## Páginas

| Rota                       | Descrição                  |
|----------------------------|----------------------------|
| `/`                        | Landing page               |
| `/politica-de-privacidade` | Política de Privacidade    |
| `/termos-de-uso`           | Termos de Uso              |
| `/termos-de-servico`       | Redirect 301 → /termos-de-uso |
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
