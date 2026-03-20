import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    syncTenantDatabase,
} from "./tenant-sync";
import {
    buildTenantDiffCommand,
    buildTenantSyncCommand,
    filterNonDestructiveSqlStatements,
    isDataLossError,
    isValidPostgresConnectionString,
    sanitizeErrorDetails,
} from "@/lib/tenant-sync-utils";
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
const mockExecFile = vi.fn();
const mockPgClient = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
};

vi.mock("child_process", () => {
    return {
        execFile: (file: string, args: string[], opts: any, cb: any) => {
            mockExecFile(file, args, opts, cb);
        },
        default: {
            execFile: (file: string, args: string[], opts: any, cb: any) => {
                mockExecFile(file, args, opts, cb);
            }
        }
    };
});

vi.mock("pg", () => ({
    Client: vi.fn(function MockClient() {
        return mockPgClient;
    }),
}));

// Importar mocks para configuração
import { prisma } from "@/lib/prisma";

describe("Tenant Database Synchronization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExecFile.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
            cb(null, "Success", "");
        });
        mockPgClient.connect.mockResolvedValue(undefined);
        mockPgClient.query.mockResolvedValue(undefined);
        mockPgClient.end.mockResolvedValue(undefined);
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
        expect(mockExecFile).toHaveBeenCalledWith(
            "npx",
            [
                "prisma",
                "db",
                "push",
                "--schema=prisma/schema.tenant.prisma",
                "--url=postgresql://user:pass@host:5432/db",
            ],
            expect.objectContaining({
                env: expect.any(Object),
            }),
            expect.any(Function),
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
        expect(mockExecFile).not.toHaveBeenCalled();
    });

    it("should fallback to non-destructive sync on data loss error", async () => {
        (prisma.crmUser.findUnique as any).mockResolvedValue({
            email: "test@example.com",
            databaseUrl: "encrypted_postgresql://user:pass@host:5432/db",
        });

        mockExecFile
            .mockImplementationOnce((file: string, args: string[], opts: any, cb: any) => {
                cb(new Error("Use the --accept-data-loss flag"), "", "");
            })
            .mockImplementationOnce((file: string, args: string[], opts: any, cb: any) => {
                cb(
                    null,
                    "CREATE TABLE \"new_table\" (\"id\" TEXT NOT NULL PRIMARY KEY);\nDROP TABLE \"chat_histories_tools\";",
                    "",
                );
            });

        const result = await syncTenantDatabase("user-123");

        expect(result.success).toBe(true);
        expect(result.message).toContain("não-destrutivo");
        expect(mockPgClient.connect).toHaveBeenCalledTimes(1);
        expect(mockPgClient.query).toHaveBeenCalledWith(
            'CREATE TABLE "new_table" ("id" TEXT NOT NULL PRIMARY KEY)',
        );
        expect(mockPgClient.end).toHaveBeenCalledTimes(1);
        expect(mockExecFile).toHaveBeenNthCalledWith(
            2,
            "npx",
            [
                "prisma",
                "migrate",
                "diff",
                "--from-config-datasource",
                "--to-schema=prisma/schema.tenant.prisma",
                "--script",
            ],
            expect.objectContaining({
                env: expect.objectContaining({
                    DATABASE_URL: "postgresql://user:pass@host:5432/db",
                }),
            }),
            expect.any(Function),
        );
    });
});

describe("Schema Integrity Check", () => {
    // Lista de tabelas que SABEMOS que devem existir no tenant.
    // Se alguém criar uma nova tabela no schema.prisma e não adicionar aqui,
    // o teste vai falhar, forçando o desenvolvedor a verificar se a sincronização
    // continua funcionando para essa nova tabela.
    const EXPECTED_TENANT_TABLES = [
        "leads",
        "lead_notes",
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

describe("Tenant Sync Helpers", () => {
    it("should validate postgres connection strings", () => {
        expect(isValidPostgresConnectionString("postgresql://tenant")).toBe(true);
        expect(isValidPostgresConnectionString("postgres://tenant")).toBe(true);
        expect(isValidPostgresConnectionString("mysql://tenant")).toBe(false);
    });

    it("should build a deterministic prisma db push command", () => {
        expect(buildTenantSyncCommand("postgresql://tenant-db")).toEqual({
            file: "npx",
            args: [
                "prisma",
                "db",
                "push",
                "--schema=prisma/schema.tenant.prisma",
                "--url=postgresql://tenant-db",
            ],
        });
    });

    it("should build a deterministic prisma migrate diff command", () => {
        expect(buildTenantDiffCommand("postgresql://tenant-db")).toEqual({
            file: "npx",
            args: [
                "prisma",
                "migrate",
                "diff",
                "--from-config-datasource",
                "--to-schema=prisma/schema.tenant.prisma",
                "--script",
            ],
        });
    });

    it("should classify data loss errors", () => {
        expect(isDataLossError(new Error("Use the --accept-data-loss flag"))).toBe(true);
        expect(isDataLossError(new Error("other error"))).toBe(false);
    });

    it("should filter destructive sql statements", () => {
        const statements = filterNonDestructiveSqlStatements(`
            CREATE TABLE "a" ("id" TEXT NOT NULL PRIMARY KEY);
            ALTER TABLE "a" ADD COLUMN "name" TEXT;
            DROP TABLE "b";
            ALTER TABLE "a" DROP COLUMN "name";
        `);

        expect(statements).toEqual([
            'CREATE TABLE "a" ("id" TEXT NOT NULL PRIMARY KEY)',
            'ALTER TABLE "a" ADD COLUMN "name" TEXT',
        ]);
    });

    it("should sanitize connection details", () => {
        const raw = "cmd --url=postgresql://postgres:supersecret@host:5432/db?schema=public";
        const sanitized = sanitizeErrorDetails(raw, "postgresql://postgres:supersecret@host:5432/db?schema=public");

        expect(sanitized).not.toContain("supersecret");
        expect(sanitized).toContain("<redacted");
    });
});
