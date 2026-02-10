# DestraFlow Platform

Plataforma SaaS Multi-tenant ("DestraFlow") construída com Next.js, desenhada para fornecer funcionalidades de CRM e automação de atendimentos via WhatsApp (Evolution API).

## 🚀 Funcionalidades

-   **Multi-tenancy Híbrido**: Arquitetura "Database-per-tenant" para isolamento de dados e escalabilidade.
-   **CRM & Gestão de Leads**: Gerenciamento completo de contatos, funil de vendas e tags.
-   **Automação de WhatsApp**: Integração com Evolution API para envio e recebimento de mensagens.
-   **Campanhas em Massa**: Criação e agendamento de disparos de mensagens para segmentos de leads.
-   **Painel Administrativo**: Gestão de usuários, tenants e configurações globais.

## 🛠 Tech Stack

-   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
-   **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
-   **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Estilização**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
-   **Autenticação**: [NextAuth.js](https://next-auth.js.org/)
-   **Integração**: [Evolution API](https://github.com/EvolutionAPI/evolution-api)

## 📋 Pré-requisitos

-   Node.js 18+
-   PostgreSQL (Local ou Cloud)
-   Instância da Evolution API (para funcionalidades de WhatsApp)

## ⚡ Instalação e Configuração

1.  **Clone o repositório**

    ```bash
    git clone https://github.com/seu-usuario/destraflow-plataform-1.git
    cd destraflow-plataform-1
    ```

2.  **Instale as dependências**

    ```bash
    npm install
    # ou
    yarn install
    # ou
    pnpm install
    ```

3.  **Configure as Variáveis de Ambiente**

    Crie um arquivo `.env` na raiz do projeto baseando-se no exemplo:

    ```bash
    cp .env.example .env
    ```

    Edite o arquivo `.env` com suas credenciais do banco de dados e segredos.
    
    > **Nota de Segurança**: Para gerar chaves seguras, você pode usar o comando `openssl`:
    > - `openssl rand -base64 32` (para Secrets)
    > - `openssl rand -hex 32` (para Chave de Criptografia)

4.  **Configure o Banco de Dados**

    Gere o cliente do Prisma e envie o schema para o banco:

    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Inicie o Servidor de Desenvolvimento**

    ```bash
    npm run dev
    ```

    Acesse [http://localhost:3000](http://localhost:3000).

## 🔒 Segurança

A plataforma implementa diversas camadas de segurança para proteger dados e infraestrutura:

### 1. Criptografia de Dados Sensíveis
Dados críticos de configuração dos tenants (como `databaseUrl` e chaves de API) são criptografados antes de serem persistidos no banco de dados usando **AES-256-GCM**.
*   Utilize a variável `DATA_ENCRYPTION_KEY` para definir a chave mestra (32 bytes em hex).
*   A descriptografia ocorre apenas em memória no servidor, no momento exato do uso.

### 2. Rate Limiting
O Middleware da aplicação implementa proteção contra abuso (Rate Limiting) baseada em IP.
*   Limite padrão: **60 requisições/minuto** por IP.
*   Aplica-se a rotas de login, admin, dashboard e webhooks.

### 3. Proteção de Webhook
O endpoint de recebimento de mensagens (`/api/webhook/evolution`) é protegido por um segredo compartilhado.
*   Configure `EVOLUTION_WEBHOOK_SECRET` no `.env`.
*   O mesmo valor deve ser configurado no header `x-webhook-secret` na Evolution API.

## 🚀 Deploy

### Vercel (Recomendado)

1.  Faça o push do código para seu repositório Git.
2.  Importe o projeto na Vercel.
3.  Configure as **Environment Variables** (baseado no `.env.example`).
    *   **Importante**: Não esqueça de gerar e adicionar a `DATA_ENCRYPTION_KEY`.
4.  O script `postinstall` configurado no `package.json` irá gerar o cliente Prisma automaticamente.

---

## 📂 Estrutura do Projeto

-   `src/app`: Páginas e rotas da aplicação (App Router).
-   `src/components`: Componentes React reutilizáveis (UI, Layouts, Features).
-   `src/lib`: Bibliotecas utilitárias, configurações do Prisma, Auth e lógica de Tenant.
-   `src/actions`: Server Actions para mutações de dados.
-   `prisma/schema.prisma`: Definição do esquema do banco de dados.
-   `scripts`: Scripts auxiliares para migrações e verificações.

## 🏗 Arquitetura

### Modelo de Dados (Multi-tenancy)

O sistema utiliza uma abordagem híbrida onde existe um banco central para autenticação e roteamento, e bancos dedicados (ou esquemas lógicos) para cada tenant.

1.  **Banco de Dados Central (CRM Operacional)**
    *   **Responsabilidade**: Gerenciamento de usuários da plataforma, autenticação e roteamento de tenants.
    *   **Tabela Principal**: `CrmUser`
    *   **Configuração**: Armazena a `databaseUrl` que define onde estão os dados isolados do cliente.

2.  **Banco de Dados do Tenant (Dados do Cliente)**
    *   **Responsabilidade**: Armazenar os dados de negócio (Leads, Conversas, Campanhas).
    *   **Tabelas Principais**:
        *   `Lead`: Entidade central do CRM.
        *   `Campaign`: Módulo de disparos.
        *   `WhatsAppContact` / `ChatHistory`: Dados brutos da integração com WhatsApp.

### Fluxos de Dados

*   **Entrada (Webhook)**: A Evolution API recebe mensagens e o sistema identifica o tenant proprietário para persistir a mensagem no banco correto.
*   **Visualização**: O middleware e a lib `tenant.ts` identificam o banco do usuário logado para realizar as consultas no contexto correto.

## � Status do Projeto

Atualmente, a plataforma está em fase de **Beta / Desenvolvimento Ativo**.

| Funcionalidade | Status | Detalhes |
| :--- | :--- | :--- |
| **Multi-tenancy** | ✅ Completo | Arquitetura híbrida funcional. |
| **Autenticação** | ✅ Completo | NextAuth com suporte a roles (Admin/User). |
| **CRM (Leads)** | ⚠️ Parcial | Gestão de Leads e Tags ok. Faltam Pipelines/Deals. |
| **WhatsApp** | ✅ Completo | Integração com Evolution API (QR Code, Envio, Recebimento). |
| **Campanhas** | ✅ Completo | Disparos em massa com agendamento e fila. |
| **Chat Ao Vivo** | ❌ Pendente | Histórico existe, mas falta interface de chat em tempo real. |
| **Testes** | ❌ Pendente | Sem cobertura de testes automatizados. |

## ⚠️ Limitações Conhecidas

1.  **Escalabilidade do Webhook**: O processamento atual de mensagens recebidas itera sobre todos os usuários para encontrar o tenant correto. Isso precisará ser otimizado (ex: indexar hash da instância) para escalar.
2.  **Rate Limiting**: O controle de taxa atual é em memória e não persiste entre reinicializações ou em ambiente serverless. Recomendado migrar para Redis (Upstash).
3.  **Migrações**: A sincronização de schema usa `db push`, o que não é ideal para produção. Recomendado migrar para `prisma migrate`.

## 🚀 Próximos Passos

- [ ] Implementar Testes Unitários e de Integração.
- [ ] Criar interface de "Bate-papo ao vivo" (Live Chat).
- [ ] Melhorar performance do Webhook.
- [ ] Implementar Pipelines de Vendas (Kanban).

## �📝 Scripts Disponíveis

-   `npm run dev`: Inicia o servidor de desenvolvimento.
-   `npm run build`: Compila a aplicação para produção.
-   `npm run start`: Inicia o servidor de produção.
-   `npm run lint`: Executa a verificação de código com ESLint.

---

Desenvolvido com ❤️ pela equipe DestraFlow.
