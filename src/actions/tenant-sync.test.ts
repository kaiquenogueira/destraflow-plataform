import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncTenantDatabase } from "./tenant-sync";
import fs from "fs";
import path from "path";

// Mocks
vi.mock("@/lib/prisma", () => ({
    prisma: {
        crmUser: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock("@/lib/encryption", () => ({
    decrypt: vi.fn((val) => val.replace("encrypted_", "")),
}));

vi.mock("@/lib/admin-auth", () => ({
    requireAdmin: vi.fn().mockResolvedValue("admin-id"),
}));

// Mock do child_process para não executar comandos reais
const mockExec = vi.fn();
vi.mock("child_process", () => {
    return {
        exec: (cmd: string, opts: any, cb: any) => {
            mockExec(cmd, opts);
            if (cb) cb(null, { stdout: "Success", stderr: "" });
            return { stdout: "Success", stderr: "" }; // Retorno síncrono simulado se necessário
        },
        default: { // Necessário para alguns imports
            exec: (cmd: string, opts: any, cb: any) => {
                mockExec(cmd, opts);
                if (cb) cb(null, { stdout: "Success", stderr: "" });
            }
        }
    };
});

// Importar mocks para configuração
import { prisma } from "@/lib/prisma";

describe("Tenant Database Synchronization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should execute prisma db push with correct connection string", async () => {
        // Setup
        (prisma.crmUser.findUnique as any).mockResolvedValue({
            email: "test@example.com",
            databaseUrl: "encrypted_postgresql://user:pass@host:5432/db",
        });

        // Execute
        const result = await syncTenantDatabase("user-123");

        // Assert
        expect(result.success).toBe(true);
        expect(mockExec).toHaveBeenCalledWith(
            expect.stringContaining('DATABASE_URL="postgresql://user:pass@host:5432/db" npx prisma db push --skip-generate'),
            expect.objectContaining({
                env: expect.objectContaining({
                    DATABASE_URL: "postgresql://user:pass@host:5432/db",
                }),
            })
        );
    });

    it("should fail if user has no database URL", async () => {
        (prisma.crmUser.findUnique as any).mockResolvedValue({
            email: "test@example.com",
            databaseUrl: null,
        });

        const result = await syncTenantDatabase("user-123");

        expect(result.success).toBe(false);
        expect(result.message).toContain("sem banco de dados");
        expect(mockExec).not.toHaveBeenCalled();
    });
});

describe("Schema Integrity Check", () => {
    // Lista de tabelas que SABEMOS que devem existir no tenant.
    // Se alguém criar uma nova tabela no schema.prisma e não adicionar aqui,
    // o teste vai falhar, forçando o desenvolvedor a verificar se a sincronização
    // continua funcionando para essa nova tabela.
    const EXPECTED_TENANT_TABLES = [
        "leads",
        "campaigns",
        "campaign_messages",
        "templates",
        "users", // WhatsAppContact
        "chat_histories",
        "external_notification",
    ];

    it("should detect all tenant tables defined in schema.prisma", () => {
        const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
        const schemaContent = fs.readFileSync(schemaPath, "utf-8");

        // Regex simples para extrair nomes de tabelas mapeadas (@@map("nome"))
        // Ignoramos 'crm_users' pois é do banco central
        const tableMatches = schemaContent.matchAll(/@@map\("([^"]+)"\)/g);
        const foundTables = Array.from(tableMatches).map(m => m[1]);

        // Filtra tabelas do sistema central que não devem estar no tenant
        const foundTenantTables = foundTables.filter(t => t !== "crm_users");

        // Verifica se todas as tabelas encontradas estão na lista de esperadas
        // Se houver diferença, significa que o schema mudou e precisamos validar a sincronização
        const newTables = foundTenantTables.filter(t => !EXPECTED_TENANT_TABLES.includes(t));
        const missingTables = EXPECTED_TENANT_TABLES.filter(t => !foundTenantTables.includes(t));

        if (newTables.length > 0) {
            throw new Error(
                `🚨 NOVAS TABELAS DETECTADAS NO SCHEMA: ${newTables.join(", ")}\n` +
                `Você adicionou novas tabelas ao Prisma Schema.\n` +
                `Por favor, verifique se a sincronização de tenants (prisma db push) vai cobrir essas tabelas corretamente.\n` +
                `Se estiver tudo certo, adicione essas tabelas à lista EXPECTED_TENANT_TABLES em src/actions/tenant-sync.test.ts para garantir a integridade futura.`
            );
        }

        if (missingTables.length > 0) {
            throw new Error(
                `🚨 TABELAS FALTANDO NO SCHEMA: ${missingTables.join(", ")}\n` +
                `Parece que tabelas foram removidas. Atualize o teste de integridade.`
            );
        }

        expect(newTables).toHaveLength(0);
        expect(missingTables).toHaveLength(0);
    });
});
