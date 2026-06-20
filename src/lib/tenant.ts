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

/**
 * Obtém o contexto do tenant atual baseado na sessão
 * Retorna null se o usuário não tem banco configurado (ex: admin)
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
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

export { requireAdmin } from "@/lib/admin-auth";
