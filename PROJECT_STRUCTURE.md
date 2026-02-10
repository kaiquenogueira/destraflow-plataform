# Estrutura do Projeto DestraFlow Platform

Este documento detalha a organização dos arquivos e diretórios do projeto para facilitar a navegação e o desenvolvimento.

## 📂 Raiz do Projeto

-   **`src/`**: Código fonte da aplicação.
-   **`prisma/`**: Configurações do banco de dados e Prisma ORM.
-   **`public/`**: Arquivos estáticos (imagens, ícones).
-   **`scripts/`**: Scripts auxiliares de manutenção e migração.
-   **`__mocks__/`**: Mocks para testes.

## 📁 `src/` - Código Fonte

### `src/app` (App Router)
Contém as rotas e páginas da aplicação Next.js.

-   **`(auth)/`**: Grupo de rotas de autenticação (Login).
-   **`(dashboard)/`**: Grupo de rotas da área logada.
    -   **`admin/`**: Gestão de usuários (apenas ADMIN).
    -   **`campaigns/`**: Gestão de campanhas de mensagens.
    -   **`dashboard/`**: Página inicial com estatísticas.
    -   **`leads/`**: Gestão de contatos (CRM).
    -   **`notifications/`**: Histórico de notificações.
    -   **`templates/`**: Gestão de templates de mensagem.
    -   **`whatsapp/`**: Conexão e status do WhatsApp.
-   **`api/`**: Rotas de API (Backend).
    -   **`auth/`**: NextAuth handlers.
    -   **`cron/`**: Tarefas agendadas (ex: processamento de mensagens).
    -   **`webhook/`**: Recebimento de eventos da Evolution API.

### `src/actions` (Server Actions)
Funções executadas no servidor, chamadas diretamente pelos componentes Client-Side.

-   `admin.ts`: Ações administrativas (criar usuários).
-   `campaigns.ts`: Lógica de campanhas.
-   `chat.ts`: Lógica de histórico de chat.
-   `leads.ts`: CRUD de leads.
-   `whatsapp.ts`: Integração com Evolution API.

### `src/components` (UI)
Componentes React divididos por contexto.

-   **`ui/`**: Componentes base do Shadcn/UI (Button, Input, etc.).
-   **`layout/`**: Sidebar, Header, Navegação Mobile.
-   **`admin/`, `campaigns/`, `leads/`**: Componentes específicos de cada módulo.

### `src/lib` (Core)
Bibliotecas e utilitários centrais.

-   `auth.ts`: Configuração do NextAuth.
-   `prisma.ts`: Cliente Prisma Singleton.
-   `tenant.ts`: **Lógica crítica de Multi-tenancy** (resolução de conexão).
-   `encryption.ts`: Criptografia de credenciais de banco.
-   `evolution.ts`: Cliente HTTP para Evolution API.

## 📁 `prisma/` - Banco de Dados

-   `schema.prisma`: Definição unificada do modelo de dados (CRM Central + Tenants).
-   `prisma.config.ts`: Configurações adicionais (se houver).

## 📁 `scripts/` - Automação

-   `migrate-hashes.ts`: Utilitário para migração de dados.
-   `sync-tenants.ts`: Sincronização de tenants (exemplo).
