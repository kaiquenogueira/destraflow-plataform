/**
 * Handlers para eventos da Evolution API
 */

import { prisma, getTenantPrisma } from "@/lib/prisma";
import { encrypt, decrypt, hashString } from "@/lib/encryption";

// Tipos de eventos da Evolution API
interface EvolutionEvent {
    event: string;
    instance: string;
    data: Record<string, unknown>;
}

interface MessageData {
    key: {
        remoteJid: string;
        fromMe: boolean;
        id: string;
    };
    message?: {
        conversation?: string;
        extendedTextMessage?: {
            text: string;
        };
    };
    messageTimestamp?: number;
    pushName?: string;
}

interface MessageUpdateData {
    key: {
        remoteJid: string;
        id: string;
    };
    update: {
        status: number; // 2=delivered, 3=read
    };
}

interface ConnectionData {
    state: string;
    statusReason?: number;
}

// Cache para mapear instance -> dados do usuário (evita scan completo no banco)
const instanceUserCache = new Map<string, { userId: string; encryptedDatabaseUrl: string }>();

/**
 * Encontra o tenant baseado na instância Evolution
 */
async function findTenantByInstance(instance: string) {
    // 1. Tenta buscar do cache
    if (instanceUserCache.has(instance)) {
        const cached = instanceUserCache.get(instance)!;
        try {
            return {
                userId: cached.userId,
                tenantPrisma: getTenantPrisma(decrypt(cached.encryptedDatabaseUrl)),
            };
        } catch (e) {
            console.error("Error connecting to cached tenant:", e);
            instanceUserCache.delete(instance); // Invalida cache se falhar
        }
    }

    // 2. Se não estiver em cache, busca no banco (otimizado via hash)
    const instanceHash = hashString(instance);
    
    const user = await prisma.crmUser.findFirst({
        where: { evolutionInstanceHash: instanceHash },
        select: { id: true, databaseUrl: true },
    });

    if (!user?.databaseUrl) {
        // Fallback para migração gradual: se não achar pelo hash, tenta o método antigo (scan)
        // Isso garante que não quebra enquanto roda a migração
        const allUsers = await prisma.crmUser.findMany({
             where: { evolutionInstanceHash: null }, // Só busca quem não tem hash ainda
             select: { id: true, databaseUrl: true, evolutionInstance: true },
        });

        const found = allUsers.find(u => {
            if (!u.evolutionInstance) return false;
            try {
                return decrypt(u.evolutionInstance) === instance;
            } catch {
                return false;
            }
        });

        if (found?.databaseUrl) {
            // Auto-heal: Salva o hash para a próxima vez ser rápido
            await prisma.crmUser.update({
                where: { id: found.id },
                data: { evolutionInstanceHash: instanceHash }
            });
            
            // Retorna o usuário encontrado
            instanceUserCache.set(instance, {
                userId: found.id,
                encryptedDatabaseUrl: found.databaseUrl
            });

            return {
                userId: found.id,
                tenantPrisma: getTenantPrisma(decrypt(found.databaseUrl)),
            };
        }

        return null;
    }

    // 3. Salva no cache para próximas requisições
    instanceUserCache.set(instance, {
        userId: user.id,
        encryptedDatabaseUrl: user.databaseUrl
    });

    return {
        userId: user.id,
        tenantPrisma: getTenantPrisma(decrypt(user.databaseUrl)),
    };
}

/**
 * Extrai número de telefone do remoteJid
 * Ex: "5511999999999@s.whatsapp.net" -> "+5511999999999"
 */
function extractPhone(remoteJid: string): string {
    const number = remoteJid.split("@")[0];
    return `+${number}`;
}

/**
 * Handler para mensagem recebida
 */
async function handleMessageUpsert(
    instance: string,
    data: MessageData
): Promise<{ action: string; phone?: string }> {
    // Ignorar mensagens enviadas por nós
    if (data.key.fromMe) {
        return { action: "ignored_self" };
    }

    const tenant = await findTenantByInstance(instance);
    if (!tenant) {
        return { action: "tenant_not_found" };
    }

    const phone = extractPhone(data.key.remoteJid);
    const messageText =
        data.message?.conversation ||
        data.message?.extendedTextMessage?.text ||
        "";

    // Buscar ou criar WhatsAppContact
    let contact = await tenant.tenantPrisma.whatsAppContact.findFirst({
        where: { whatsapp: phone },
    });

    if (!contact) {
        contact = await tenant.tenantPrisma.whatsAppContact.create({
            data: {
                whatsapp: phone,
                name: data.pushName || phone,
            },
        });
    }

    // Garante que o Lead existe (mesmo se o contato já existia)
    const existingLead = await tenant.tenantPrisma.lead.findFirst({
        where: { phone },
    });

    if (!existingLead) {
        await tenant.tenantPrisma.lead.create({
            data: {
                name: contact.name || data.pushName || phone,
                phone,
                tag: "COLD",
                interest: "Via WhatsApp",
            },
        });
    } else {
        // Atualizar data de modificação para subir no CRM
        await tenant.tenantPrisma.lead.update({
            where: { id: existingLead.id },
            data: { updatedAt: new Date() }
        });
    }

    // Salvar histórico de chat
    // REMOVIDO: A automação de IA externa é responsável por registrar o retorno do cliente.
    /*
    await tenant.tenantPrisma.chatHistory.create({
        data: {
            userId: contact.id,
            message: {
                type: "incoming",
                text: messageText,
                timestamp: data.messageTimestamp,
                messageId: data.key.id,
            },
        },
    });
    */

    return { action: "message_saved", phone };
}

/**
 * Handler para atualização de status de mensagem
 */
async function handleMessageUpdate(
    instance: string,
    data: MessageUpdateData
): Promise<{ action: string }> {
    const tenant = await findTenantByInstance(instance);
    if (!tenant) {
        return { action: "tenant_not_found" };
    }

    // Status: 2 = delivered, 3 = read
    // Por enquanto, apenas logamos. Podemos adicionar tracking de delivery/read futuramente.
    console.log(`Message ${data.key.id} status updated to ${data.update.status}`);

    return { action: "status_logged" };
}

/**
 * Handler para mudança de conexão
 */
async function handleConnectionUpdate(
    instance: string,
    data: ConnectionData
): Promise<{ action: string; state: string }> {
    console.log(`Instance ${instance} connection: ${data.state}`);

    // Podemos adicionar notificação para admin se instância desconectar
    if (data.state === "close") {
        // TODO: Criar notificação de alerta
    }

    return { action: "connection_logged", state: data.state };
}

/**
 * Handler principal que roteia eventos
 */
export async function handleWebhookEvent(
    event: EvolutionEvent
): Promise<{ event: string; result: Record<string, unknown> }> {
    const { event: eventType, instance, data } = event;

    let result: Record<string, unknown> = {};

    switch (eventType) {
        case "MESSAGES_UPSERT":
        case "messages.upsert":
            result = await handleMessageUpsert(instance, data as unknown as MessageData);
            break;

        case "MESSAGES_UPDATE":
        case "messages.update":
            result = await handleMessageUpdate(instance, data as unknown as MessageUpdateData);
            break;

        case "CONNECTION_UPDATE":
        case "connection.update":
            result = await handleConnectionUpdate(instance, data as unknown as ConnectionData);
            break;

        default:
            result = { action: "ignored", reason: `Unknown event: ${eventType}` };
    }

    return { event: eventType, result };
}
