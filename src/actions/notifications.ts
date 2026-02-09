"use server";

import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * Buscar notificações pendentes (escalonamento para humano)
 */
export async function getNotifications(params?: {
    page?: number;
    limit?: number;
}) {
    const context = await getTenantContext();
    if (!context) {
        return { notifications: [], total: 0, pages: 0, currentPage: 1 };
    }
    const { tenantPrisma } = context;
    const { page = 1, limit = 20 } = params || {};

    const [notifications, total] = await Promise.all([
        tenantPrisma.externalNotification.findMany({
            orderBy: { criadoEm: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        tenantPrisma.externalNotification.count(),
    ]);

    return {
        notifications,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
    };
}

/**
 * Contar notificações não lidas (para badge)
 */
export async function getUnreadNotificationCount() {
    const context = await getTenantContext();
    if (!context) {
        return 0;
    }
    const { tenantPrisma } = context;

    // Notificações das últimas 24 horas são consideradas "não lidas"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const count = await tenantPrisma.externalNotification.count({
        where: {
            criadoEm: { gte: yesterday },
        },
    });

    return count;
}

/**
 * Buscar notificação por ID
 */
export async function getNotificationById(id: number) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    const notification = await tenantPrisma.externalNotification.findUnique({
        where: { id },
    });

    if (!notification) {
        throw new Error("Notificação não encontrada");
    }

    return notification;
}

/**
 * Deletar notificação (após resolver)
 */
export async function deleteNotification(id: number) {
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    await tenantPrisma.externalNotification.delete({
        where: { id },
    });

    revalidatePath("/notifications");
    return { success: true };
}

/**
 * Buscar notificações por cliente (telefone)
 */
export async function getNotificationsByPhone(phone: string) {
    const context = await getTenantContext();
    if (!context) {
        return [];
    }
    const { tenantPrisma } = context;

    const notifications = await tenantPrisma.externalNotification.findMany({
        where: { numeroCliente: phone },
        orderBy: { criadoEm: "desc" },
        take: 10,
    });

    return notifications;
}
