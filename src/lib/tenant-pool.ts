import { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";

/**
 * Cache LRU de pools Prisma por tenant — extraído de prisma.ts para tornar suas
 * 4 invariantes (keying, cap, evicção LRU, teardown) explícitas e testáveis SEM
 * reach-in no Map interno e SEM pg real (via create/onEvict injetáveis).
 *
 * A chave de cache é o `tenantId` (identidade estável), não a URL crua: duas URLs
 * equivalentes deixam de gerar pools separados. A decifragem do segredo vive no
 * `create` injetado (em prisma.ts, via decryptSecret) — assim "nunca abrir pool de
 * ciphertext/texto-plano" fica garantido por construção.
 */

/** Conexão de tenant: identidade estável (tenantId) + URL criptografada (decifrada no create). */
export interface TenantConnection {
    tenantId: string;
    encryptedUrl: string;
}

/** Cache LRU com interface observável. */
export interface TenantPoolCache {
    /** Client já em cache para o tenant, ou undefined. Não cria. */
    get(tenantId: string): TenantPrismaClient | undefined;
    /** Retorna o client do tenant, criando (e cacheando) no miss. */
    getOrCreate(conn: TenantConnection): TenantPrismaClient;
    /** Quantidade de pools vivos no cache. */
    size(): number;
    /** Há pool em cache para este tenant? (hit/miss sem reach-in) */
    has(tenantId: string): boolean;
    /** Capacidade máxima (cap LRU). */
    readonly capacity: number;
}

export interface TenantPoolOptions {
    /** Cap do LRU. Default 10. */
    capacity?: number;
    /** Cria um client a partir da URL criptografada (decifra internamente). Injetável p/ teste. */
    create: (encryptedUrl: string) => TenantPrismaClient;
    /** Chamado quando um client é evictado (teardown, ex.: $disconnect). Observável. */
    onEvict?: (client: TenantPrismaClient) => void;
}

const DEFAULT_CAPACITY = 10;

export function createTenantPoolCache(options: TenantPoolOptions): TenantPoolCache {
    const capacity = options.capacity ?? DEFAULT_CAPACITY;
    const { create, onEvict } = options;
    const clients = new Map<string, TenantPrismaClient>();

    function touch(tenantId: string, client: TenantPrismaClient) {
        // Reordena: move para o final (mais recente).
        clients.delete(tenantId);
        clients.set(tenantId, client);
    }

    function evictOldestIfFull() {
        if (clients.size < capacity) return;
        const oldestKey = clients.keys().next().value;
        if (oldestKey === undefined) return;
        const evicted = clients.get(oldestKey);
        clients.delete(oldestKey);
        if (evicted && onEvict) onEvict(evicted);
    }

    return {
        capacity,
        get(tenantId) {
            return clients.get(tenantId);
        },
        has(tenantId) {
            return clients.has(tenantId);
        },
        size() {
            return clients.size;
        },
        getOrCreate(conn) {
            const existing = clients.get(conn.tenantId);
            if (existing) {
                touch(conn.tenantId, existing);
                return existing;
            }
            evictOldestIfFull();
            const client = create(conn.encryptedUrl);
            clients.set(conn.tenantId, client);
            return client;
        },
    };
}
