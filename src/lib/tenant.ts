import { cache } from "react";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import type { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";

export interface TenantContext {
    userId: string;
    userRole: "ADMIN" | "USER";
    tenantPrisma: TenantPrismaClient;
    aiMessagesUsed?: number;
    aiMessagesLimit?: number;
    aiLimitResetAt?: Date | null;
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

    const databaseUrl = decrypt(user.databaseUrl);

    return {
        userId: user.id,
        userRole: user.role,
        tenantPrisma: getTenantPrisma(databaseUrl),
        aiMessagesUsed: user.aiMessagesUsed,
        aiMessagesLimit: user.aiMessagesLimit,
        aiLimitResetAt: user.aiLimitResetAt,
    };
});

export { requireAdmin } from "@/lib/admin-auth";
