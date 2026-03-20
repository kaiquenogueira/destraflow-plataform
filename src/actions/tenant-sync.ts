"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { execFile } from "child_process";
import { promisify } from "util";
import { Client } from "pg";
import {
    buildTenantDiffCommand,
    buildTenantSyncCommand,
    filterNonDestructiveSqlStatements,
    isDataLossError,
    isValidPostgresConnectionString,
    sanitizeErrorDetails,
} from "@/lib/tenant-sync-utils";

const execFileAsync = promisify(execFile);

export type SyncResult = {
    success: boolean;
    message: string;
    details?: string;
};

async function executeSqlStatements(connectionString: string, statements: string[]): Promise<number> {
    if (statements.length === 0) {
        return 0;
    }

    const client = new Client({ connectionString });
    await client.connect();

    try {
        for (const statement of statements) {
            await client.query(statement);
        }
    } finally {
        await client.end();
    }

    return statements.length;
}

async function syncTenantDatabaseNonDestructive(connectionString: string, userEmail: string): Promise<SyncResult> {
    const diffCommand = buildTenantDiffCommand(connectionString);
    const diffResult = await execFileAsync(diffCommand.file, diffCommand.args, {
        env: { ...process.env, DATABASE_URL: connectionString },
    });
    const stdout = typeof diffResult === "string" ? diffResult : diffResult.stdout || "";

    const statements = filterNonDestructiveSqlStatements(stdout);
    const executedCount = await executeSqlStatements(connectionString, statements);

    if (executedCount === 0) {
        console.log(`✅ Sincronização não-destrutiva concluída para ${userEmail} sem alterações pendentes`);
        return {
            success: true,
            message: "Schema compatível; nenhuma alteração não-destrutiva necessária",
            details: "Prisma detectou somente alterações destrutivas opcionais (não aplicadas).",
        };
    }

    console.log(`✅ Sincronização não-destrutiva aplicada para ${userEmail} (${executedCount} mudanças)`);
    return {
        success: true,
        message: "Banco sincronizado em modo não-destrutivo",
        details: `Alterações aplicadas: ${executedCount}`,
    };
}

export async function syncTenantDatabase(userId: string): Promise<SyncResult> {
    try {
        await requireAdmin();

        const user = await prisma.crmUser.findUnique({
            where: { id: userId },
            select: { email: true, databaseUrl: true },
        });

        if (!user) {
            return { success: false, message: "Usuário não encontrado" };
        }

        if (!user.databaseUrl) {
            return { success: false, message: "Usuário sem banco de dados configurado" };
        }

        const connectionString = decrypt(user.databaseUrl);
        
        // Validação básica da string de conexão
        if (!isValidPostgresConnectionString(connectionString)) {
            return { success: false, message: "URL do banco de dados inválida" };
        }

        console.log(`🔄 Iniciando sincronização para ${user.email}...`);

        // Executar prisma db push
        // --skip-generate: Não gerar o cliente Prisma (já temos)
        // --accept-data-loss: Aceitar perda de dados se houver alterações destrutivas (cuidado, mas necessário para automação às vezes)
        // Mas para segurança, melhor NÃO usar --accept-data-loss por padrão em produção sem aviso.
        // Vamos usar apenas `prisma db push` padrão que falha se houver data loss, ou pedir confirmação.
        // Como é "garantir que tem as tabelas", o push padrão é o melhor.
        
        // Usamos --url para sobrescrever a conexão definida no prisma.config.ts/schema
        // Isso garante que conectamos no tenant e não no CRM
        const command = buildTenantSyncCommand(connectionString);

        let stdout = "";
        try {
            const result = await execFileAsync(command.file, command.args, {
                env: { ...process.env },
            });
            stdout = typeof result === "string" ? result : result.stdout || "";
        } catch (error) {
            if (isDataLossError(error)) {
                return await syncTenantDatabaseNonDestructive(connectionString, user.email);
            }
            throw error;
        }

        console.log(`✅ Sincronização concluída para ${user.email}`);
        
        return {
            success: true,
            message: "Banco de dados sincronizado com sucesso",
            details: stdout,
        };

    } catch (error: any) {
        console.error("❌ Erro na sincronização:", error);
        const details = sanitizeErrorDetails(error?.message || String(error));
        return {
            success: false,
            message: "Falha ao sincronizar banco de dados",
            details,
        };
    }
}
