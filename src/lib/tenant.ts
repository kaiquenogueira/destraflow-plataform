import { cache } from "react";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { validatePrincipal } from "@/lib/principal";
import type { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";
import type { QuotaState } from "@/services/ai/ai-quota";

export interface TenantContext {
    userId: string;
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
    // Identidade (e seu vocabulário de erro) é dona de src/lib/principal.ts.
    const principal = await validatePrincipal(session);

    const user = await prisma.crmUser.findUnique({
        where: { id: principal.id },
        select: {
            databaseUrl: true,
            aiMessagesUsed: true,
            aiMessagesLimit: true,
            aiLimitResetAt: true,
        },
    });

    // Admin ou usuário sem banco configurado
    if (!user?.databaseUrl) {
        return null;
    }

    return {
        userId: principal.id,
        tenantPrisma: getTenantPrisma({ tenantId: principal.id, encryptedUrl: user.databaseUrl }),
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
