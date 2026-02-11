"use server";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { encrypt, decrypt, hashString } from "@/lib/encryption";
import { requireAdmin } from "@/lib/admin-auth";
import { syncTenantDatabase } from "./tenant-sync";

// Schema de validação
const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    role: z.enum(["ADMIN", "USER"]),
    databaseUrl: z.string().optional(),
    evolutionInstance: z.string().optional(),
    evolutionApiKey: z.string().optional(),
    evolutionPhone: z.string().optional(),
});

const updateUserSchema = createUserSchema.partial().extend({
    id: z.string(),
});

export async function getUsers() {
    await requireAdmin();

    const users = await prisma.crmUser.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            databaseUrl: true,
            evolutionInstance: true,
            // Dados sensíveis removidos da listagem
            createdAt: true,
            updatedAt: true,
        },
    });

    return users;
}

export async function getUserById(id: string) {
    await requireAdmin();

    const user = await prisma.crmUser.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            databaseUrl: true,
            evolutionInstance: true,
            evolutionApiKey: true,
            evolutionPhone: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new Error("Usuário não encontrado");
    }

    // Descriptografar dados sensíveis para edição
    return {
        ...user,
        databaseUrl: decrypt(user.databaseUrl || ""),
        evolutionInstance: decrypt(user.evolutionInstance || ""),
        evolutionApiKey: decrypt(user.evolutionApiKey || ""),
    };
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
    await requireAdmin();
    const validated = createUserSchema.parse(data);

    // Verificar se email já existe
    const existing = await prisma.crmUser.findUnique({
        where: { email: validated.email },
    });

    if (existing) {
        throw new Error("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await hash(validated.password, 10);

    const user = await prisma.crmUser.create({
        data: {
            email: validated.email,
            password: hashedPassword,
            name: validated.name,
            role: validated.role,
            databaseUrl: encrypt(validated.databaseUrl || ""),
            evolutionInstance: encrypt(validated.evolutionInstance || ""),
            evolutionInstanceHash: validated.evolutionInstance ? hashString(validated.evolutionInstance) : null,
            evolutionApiKey: encrypt(validated.evolutionApiKey || ""),
            evolutionPhone: validated.evolutionPhone,
        },
    });

    // Tentar sincronizar o banco de dados se houver URL configurada
    if (validated.databaseUrl) {
        console.log(`🚀 Acionando sincronização automática para ${user.email}`);
        // Não vamos bloquear o retorno se falhar, mas vamos logar
        // Ou podemos bloquear? O usuário pediu "garantir". 
        // Se falhar aqui, o usuário foi criado mas o banco não está pronto.
        // Vamos aguardar e logar.
        const syncResult = await syncTenantDatabase(user.id);
        if (!syncResult.success) {
            console.error(`⚠️ Aviso: Usuário criado, mas falha na sincronização do DB: ${syncResult.message}`);
        }
    }

    revalidatePath("/admin/users");
    return { success: true, userId: user.id };
}

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
    await requireAdmin();
    const validated = updateUserSchema.parse(data);
    const { id, password, ...updateData } = validated;

    // Se tiver senha, fazer hash
    const dataToUpdate: Record<string, unknown> = { ...updateData };
    if (password) {
        dataToUpdate.password = await hash(password, 10);
    }

    // Criptografar dados sensíveis se fornecidos
    if (updateData.databaseUrl) {
        dataToUpdate.databaseUrl = encrypt(updateData.databaseUrl);
    }
    if (updateData.evolutionInstance) {
        dataToUpdate.evolutionInstance = encrypt(updateData.evolutionInstance);
        dataToUpdate.evolutionInstanceHash = hashString(updateData.evolutionInstance);
    }
    if (updateData.evolutionApiKey) {
        dataToUpdate.evolutionApiKey = encrypt(updateData.evolutionApiKey);
    }
    if (updateData.evolutionPhone) {
        dataToUpdate.evolutionPhone = updateData.evolutionPhone;
    }

    await prisma.crmUser.update({
        where: { id },
        data: dataToUpdate,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true };
}

export async function resetUserPassword(userId: string, newPassword: string) {
    await requireAdmin();

    if (newPassword.length < 6) {
        throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    const hashedPassword = await hash(newPassword, 10);

    await prisma.crmUser.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return { success: true };
}

export async function deleteUser(id: string) {
    const adminId = await requireAdmin();

    // Não permitir deletar a si mesmo
    if (id === adminId) {
        throw new Error("Você não pode deletar sua própria conta");
    }

    await prisma.crmUser.delete({
        where: { id },
    });

    revalidatePath("/admin/users");
    return { success: true };
}

export async function getUserNotifications(userId: string) {
    await requireAdmin();

    const user = await prisma.crmUser.findUnique({
        where: { id: userId },
        select: { databaseUrl: true },
    });

    if (!user || !user.databaseUrl) {
        return [];
    }

    try {
        const { getTenantPrisma } = await import("@/lib/prisma");
        const { decrypt } = await import("@/lib/encryption");
        
        const tenantPrisma = getTenantPrisma(decrypt(user.databaseUrl));
        
        const notifications = await tenantPrisma.externalNotification.findMany({
            orderBy: { criadoEm: "desc" },
            take: 50, // Limite inicial para não sobrecarregar
        });

        return notifications;
    } catch (error) {
        console.error("Erro ao buscar notificações do usuário:", error);
        return [];
    }
}
