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
-   `campaigns.ts`: Lógica de campanhas, criação, cancelamento e **retry de mensagens DEAD_LETTER** (massa e individual).
-   `chat.ts`: Lógica de histórico de chat.
-   `contacts.ts`: Gestão de contatos WhatsApp.
-   `leads.ts`: CRUD de leads e **importação em massa via CSV/XLSX** com normalização e deduplicação.
-   `notes.ts`: Notas associadas a leads.
-   `notifications.ts`: Notificações externas.
-   `templates.ts`: Gestão de templates de mensagem.
-   `whatsapp.ts`: Integração com Evolution API.

### `src/components` (UI)
Componentes React divididos por contexto.

-   **`ui/`**: Componentes base do Shadcn/UI (Button, Input, Dialog, etc.).
-   **`layout/`**: Sidebar, Header, Navegação Mobile.
-   **`admin/`**: Gestão de usuários e tenants.
-   **`campaigns/`**: Formulário de campanha (`campaign-form`), listagem (`campaign-list`) e **tabela de mensagens com retry** (`campaign-messages`).
-   **`leads/`**: Lista, Kanban, formulário, detalhes, envio de mensagem, notas e **importação de planilha** (`lead-import`).
-   **`dashboard/`**: Componentes de métricas e estatísticas.
-   **`templates/`**: Gestão de templates.
-   **`notifications/`**: Listagem de notificações.

### `src/lib` (Core)
Bibliotecas e utilitários centrais.

-   `auth.ts`: Configuração do NextAuth.
-   `prisma.ts`: Cliente Prisma Singleton.
-   `tenant.ts`: **Lógica crítica de Multi-tenancy** (resolução de conexão).
-   `encryption.ts`: Criptografia de credenciais de banco.
-   `evolution.ts`: Cliente HTTP para Evolution API.
-   `worker.ts`: Worker de processamento de mensagens (fila, retry com backoff, DEAD_LETTER).

## 📁 `prisma/` - Banco de Dados

-   `schema.prisma`: Definição unificada do modelo de dados (CRM Central + Tenants).
-   `prisma.config.ts`: Configurações adicionais (se houver).

## 📁 `scripts/` - Automação

-   `backfill-hashes.ts`: Reparo de `evolutionInstanceHash` legado (re-deriva via `tenant-credentials`).
-   `sync-tenants.ts`: Sincronização de tenants (exemplo).
