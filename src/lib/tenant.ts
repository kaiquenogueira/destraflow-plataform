"use server";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export interface TenantContext {
    userId: string;
    userRole: "ADMIN" | "USER";
    tenantPrisma: PrismaClient;
}

/**
 * Obtém o contexto do tenant atual baseado na sessão
 * Retorna null se o usuário não tem banco configurado (ex: admin)
 */
export async function getTenantContext(): Promise<TenantContext | null> {
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
        tenantPrisma: getTenantPrisma(user.databaseUrl),
    };
}

/**
 * Verifica se o usuário atual é admin
 */
export async function requireAdmin(): Promise<void> {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
        throw new Error("Não autorizado");
    }

    const user = await prisma.crmUser.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "ADMIN") {
        throw new Error("Acesso negado. Apenas administradores.");
    }
}
