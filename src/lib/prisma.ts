import { PrismaClient as CrmPrismaClient } from "@prisma/client";
import { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: CrmPrismaClient | undefined;
};

function createPrismaClient(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new CrmPrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function createTenantPrismaClient(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new TenantPrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Cliente central (banco CRM - login/admin)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cache de conexões para tenants (LRU - Least Recently Used)
const tenantClients = new Map<string, TenantPrismaClient>();
const MAX_TENANT_CLIENTS = 10;

/**
 * Obtém um cliente Prisma para o banco do tenant
 * Usa cache LRU para evitar criar pools excessivos e vazamento de memória
 */
export function getTenantPrisma(databaseUrl: string): TenantPrismaClient {
  if (tenantClients.has(databaseUrl)) {
    const client = tenantClients.get(databaseUrl)!;
    // Move para o final (mais recente)
    tenantClients.delete(databaseUrl);
    tenantClients.set(databaseUrl, client);
    return client;
  }

  // Se atingiu o limite, remove o mais antigo (primeiro inserido)
  if (tenantClients.size >= MAX_TENANT_CLIENTS) {
    const oldestKey = tenantClients.keys().next().value;
    if (oldestKey) {
      const clientToRemove = tenantClients.get(oldestKey);
      // Tenta desconectar graciosamente, mas não bloqueia se falhar
      clientToRemove?.$disconnect().catch((e: unknown) => 
        console.error("Failed to disconnect evicted tenant client:", e)
      );
      tenantClients.delete(oldestKey);
    }
  }

  const client = createTenantPrismaClient(databaseUrl);
  tenantClients.set(databaseUrl, client);

  return client;
}
