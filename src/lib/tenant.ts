import { cache } from "react";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import type { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";
import type { QuotaState } from "@/services/ai/ai-quota";

export interface TenantContext {
    userId: string;
    userRole: "ADMIN" | "USER";
    tenantPrisma: TenantPrismaClient;
    /** Quota de personalização por IA (CRM DB). Dona da regra: src/services/ai/ai-quota.ts. */
    aiQuota?: QuotaState;
}

/** Mensagem canônica para "usuário sem banco de tenant" (admin ou tenant sem databaseUrl). */
export const NO_TENANT_DB_MESSAGE = "Banco de dados não configurado";

/** Erro lançado por requireTenantContext quando não há Tenant DB configurado. */
export class NoTenantDatabaseError extends Error {
    constructor() {
        super(NO_TENANT_DB_MESSAGE);
        this.name = "NoTenantDatabaseError";
    }
}

/**
 * Obtém o contexto do tenant atual baseado na sessão.
 * Retorna null quando o usuário não tem banco configurado (ex: admin).
 * Use em caminhos de LEITURA que degradam graciosamente para um estado-vazio.
 */
export const getOptionalTenantContext = cache(async (): Promise<TenantContext | null> => {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
        throw new Error("Não autorizado");
    }

    const user = await prisma.crmUser.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            role: true,
            databaseUrl: true,
            aiMessagesUsed: true,
            aiMessagesLimit: true,
            aiLimitResetAt: true,
        },
    });

    if (!user) {
        throw new Error("Usuário não encontrado");
    }

    // Admin ou usuário sem banco configurado
    if (!user.databaseUrl) {
        return null;
    }

    return {
        userId: user.id,
        userRole: user.role,
        tenantPrisma: getTenantPrisma({ tenantId: user.id, encryptedUrl: user.databaseUrl }),
        aiQuota: {
            used: user.aiMessagesUsed,
            limit: user.aiMessagesLimit,
            resetAt: user.aiLimitResetAt,
        },
    };
});

/**
 * Obtém o contexto do tenant, exigindo um Tenant DB configurado.
 * Nunca retorna null: lança NoTenantDatabaseError quando não há banco.
 * Use em operações de MUTAÇÃO ou by-id que não podem prosseguir sem banco.
 * Reusa o resolver cache()d, então a sessão/DB continua deduplicada por request.
 */
export async function requireTenantContext(): Promise<TenantContext> {
    const context = await getOptionalTenantContext();
    if (!context) {
        throw new NoTenantDatabaseError();
    }
    return context;
}

export { requireAdmin } from "@/lib/admin-auth";
