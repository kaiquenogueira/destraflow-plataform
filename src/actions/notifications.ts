"use server";

import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Buscar notificações pendentes (escalonamento para humano)
 */
export async function getNotifications(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
}) {
    const context = await getTenantContext();
    if (!context) {
        return { notifications: [], total: 0, pages: 0, currentPage: 1 };
    }
    const { tenantPrisma } = context;
    const { page = 1, limit = 20, startDate, endDate } = params || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.criadoEm = {
            ...where.criadoEm,
            gte: start,
        };
    }

    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.criadoEm = {
            ...where.criadoEm,
            lte: end,
        };
    }

    const [notifications, total] = await Promise.all([
        tenantPrisma.externalNotification.findMany({
            where,
            orderBy: { criadoEm: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        tenantPrisma.externalNotification.count({ where }),
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
    const validId = z.number().int().positive().parse(id);
    const context = await getTenantContext();
    if (!context) {
        throw new Error("Banco de dados não configurado");
    }
    const { tenantPrisma } = context;

    await tenantPrisma.externalNotification.delete({
        where: { id: validId },
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
