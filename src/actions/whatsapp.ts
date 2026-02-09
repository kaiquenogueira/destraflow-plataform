"use server";

import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/encryption";

async function getCurrentUserId(): Promise<string> {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
        throw new Error("Não autorizado");
    }
    return session.user.id;
}

async function getUserEvolutionConfig() {
    const userId = await getCurrentUserId();

    const user = await prisma.crmUser.findUnique({
        where: { id: userId },
        select: {
            evolutionInstance: true,
            evolutionApiKey: true,
        },
    });

    if (!user?.evolutionInstance) {
        throw new Error("Instância do WhatsApp não configurada");
    }

    return {
        instanceName: decrypt(user.evolutionInstance),
        apiKey: user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined,
    };
}

export async function getWhatsAppStatus() {
    try {
        const config = await getUserEvolutionConfig();
        const client = createEvolutionClient(config.instanceName, config.apiKey);
        const status = await client.getInstanceStatus();

        return {
            success: true,
            ...status,
        };
    } catch (error) {
        return {
            success: false,
            connected: false,
            state: "not_configured",
            error: error instanceof Error ? error.message : "Erro desconhecido",
        };
    }
}

export async function generateQRCode() {
    try {
        const config = await getUserEvolutionConfig();
        const client = createEvolutionClient(config.instanceName, config.apiKey);
        const qrCode = await client.generateQRCode();

        return {
            success: true,
            qrCode,
        };
    } catch (error) {
        return {
            success: false,
            qrCode: null,
            error: error instanceof Error ? error.message : "Erro ao gerar QR Code",
        };
    }
}

export async function disconnectWhatsApp() {
    try {
        const config = await getUserEvolutionConfig();
        const client = createEvolutionClient(config.instanceName, config.apiKey);
        await client.disconnect();

        revalidatePath("/whatsapp");
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao desconectar",
        };
    }
}

export async function saveEvolutionConfig(
    instanceName: string,
    apiKey?: string
) {
    const userId = await getCurrentUserId();

    await prisma.crmUser.update({
        where: { id: userId },
        data: {
            evolutionInstance: encrypt(instanceName),
            evolutionApiKey: apiKey ? encrypt(apiKey) : null,
        },
    });

    revalidatePath("/whatsapp");
    return { success: true };
}
