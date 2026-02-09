import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Cliente central (banco CRM - login/admin)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cache de conexões para tenants
const tenantClients = new Map<string, PrismaClient>();

/**
 * Obtém um cliente Prisma para o banco do tenant
 * Usa cache para evitar criar pools a cada request
 */
export function getTenantPrisma(databaseUrl: string): PrismaClient {
  if (tenantClients.has(databaseUrl)) {
    return tenantClients.get(databaseUrl)!;
  }

  const client = createPrismaClient(databaseUrl);
  tenantClients.set(databaseUrl, client);

  return client;
}
