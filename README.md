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

## 📝 Scripts Disponíveis

-   `npm run dev`: Inicia o servidor de desenvolvimento.
-   `npm run build`: Compila a aplicação para produção.
-   `npm run start`: Inicia o servidor de produção.
-   `npm run lint`: Executa a verificação de código com ESLint.

---

Desenvolvido com ❤️ pela equipe DestraFlow.
