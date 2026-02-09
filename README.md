This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Análise de Arquitetura do Projeto DestraFlow
Visão Geral
O projeto é uma plataforma SaaS Multi-tenant ("DestraFlow") construída com Next.js, desenhada para fornecer funcionalidades de CRM e automação de atendimentos via WhatsApp (Evolution API).

Arquitetura de Dados (Multi-tenancy Híbrido)
1. Banco de Dados Central (CRM Operacional)
Responsabilidade: Gerenciamento de usuários da plataforma (seus clientes), autenticação e roteamento de tenants.
Tabela Principal: CrmUser
databaseUrl: Define onde estão os dados isolados deste cliente.
evolutionInstance / apiKey: Configurações da instância de WhatsApp deste cliente.
Modelo de Isolamento: "Database-per-tenant" (Banco por cliente). O databaseUrl pode apontar para o mesmo banco central (isolamento lógico se usasse schema, mas aqui parece físico ou lógico via URL) ou bancos fisicamente separados.
2. Banco de Dados do Tenant (Dados do Cliente)
Responsabilidade: Armazenar os dados de negócio do seu cliente (Leads, Conversas, Campanhas).
Tabelas Principais:
Lead
: A entidade central do CRM. É aqui que o seu cliente gerencia os contatos.
Campaign / CampaignMessage: Módulo de disparos em massa.
WhatsAppContact (mapeado como users): Tabela legada/operacional do bot/Evolution API. Armazena quem entrou em contato via WhatsApp.
ChatHistory: Histórico de mensagens.
Fluxos de Dados Críticos
Fluxo de Entrada (Webhook)
Origem: Evolution API recebe mensagem do WhatsApp.
Identificação: O sistema busca o tenant dono da instância (
findTenantByInstance
).
Persistência Atual:
Busca/Cria WhatsAppContact (users).
Salva ChatHistory.
Ponto de Atenção: Atualmente, a criação de 
Lead
 (a entidade CRM) só ocorre se o WhatsAppContact for novo. Contatos antigos não viram Leads automaticamente.
Fluxo de Visualização (Dashboard)
Autenticação: O usuário loga (NextAuth).
Contexto: O middleware/lib 
tenant.ts
 identifica o banco do usuário logado.
Consulta: As páginas consultam o banco do tenant.
A página de Leads consulta a tabela 
Lead
.
Problema Atual: Como existe um descompasso entre a tabela técnica users (bot) e a tabela de negócio 
leads
 (CRM), o usuário vê zero leads, mesmo tendo contatos no bot.
Avaliação da Proposta de CRM
A estrutura está correta e bem pavimentada para escalar.

Pontos Fortes
Isolamento de Dados: A abordagem de databaseUrl por usuário permite que você tenha clientes pequenos num banco compartilhado e mova clientes grandes para bancos dedicados sem mudar o código.
Separação de Preocupações:
WhatsAppContact = Dados brutos, técnicos, perfil do WhatsApp (foto, pushname).
Lead
 = Dados de negócio, qualificação (tags, funil, anotações).
Essa separação é vital. Nem todo contato de WhatsApp é um Lead qualificado, mas todo Lead deve estar vinculado a um contato.
Pontos de Melhoria (Roadmap Imediato)
Sincronização Bidirecional: O 
Lead
 precisa ser a fonte da verdade para o CRM. O WhatsAppContact é apenas um canal. É necessário garantir que qualquer interação relevante crie/atualize o Lead.
Unificação de Identidade: No futuro, um Lead pode ter email, telefone, instagram. O modelo atual amarra muito ao telefone (o que é ok para MVP focado em WhatsApp).
Plano de Ação (Refinado)
Migração Inicial (Saneamento)

Script para varrer todos os bancos de tenant.
Transformar todos os WhatsAppContact existentes em 
Lead
 (Tag: COLD ou INBOX).
Ajuste no Webhook (Evolução)

Quando chegar mensagem de alguém que já é WhatsAppContact mas não tem 
Lead
: Criar o Lead.
Garantir que o 
Lead
 sempre exista para interações ativas.
Visualização Unificada

Na tela de Leads, permitir ver o histórico de conversas (vincular 
Lead
 -> WhatsAppContact -> ChatHistory).
Conclusão
Sua infraestrutura suporta perfeitamente o objetivo. O problema atual é apenas de sincronização de dados entre a camada "Bot" e a nova camada "CRM". O plano de migração resolverá isso.