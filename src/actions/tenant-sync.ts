"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type SyncResult = {
    success: boolean;
    message: string;
    details?: string;
};

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
        if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
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
        const command = `npx prisma db push --schema=prisma/schema.tenant.prisma --url="${connectionString}"`;

        const { stdout, stderr } = await execAsync(command, {
            env: { ...process.env },
        });

        console.log(`✅ Sincronização concluída para ${user.email}`);
        
        return {
            success: true,
            message: "Banco de dados sincronizado com sucesso",
            details: stdout,
        };

    } catch (error: any) {
        console.error("❌ Erro na sincronização:", error);
        return {
            success: false,
            message: "Falha ao sincronizar banco de dados",
            details: error.message || String(error),
        };
    }
}
