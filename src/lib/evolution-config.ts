import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export interface EvolutionConfig {
    instanceName: string;
    apiKey?: string;
}

/**
 * Config Evolution do principal autenticado (CRM DB).
 * Lê instância + apiKey criptografadas, decripta e devolve. Lança se não houver instância.
 * Dono único do idioma "ler + decriptar config Evolution do usuário"; `userId` explícito
 * mantém o helper puro quanto à origem da sessão.
 */
export async function getUserEvolutionConfig(userId: string): Promise<EvolutionConfig> {
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
