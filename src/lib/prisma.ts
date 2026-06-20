import { PrismaClient as CrmPrismaClient } from "@prisma/client";
import { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createTenantPoolCache, type TenantConnection } from "@/lib/tenant-pool";
import { decryptSecret } from "@/lib/encryption";

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

// Cache LRU de conexões de tenant. A decifragem ESTRITA (decryptSecret) vive aqui:
// um databaseUrl não-ciphertext LANÇA antes de createTenantPrismaClient — impossível,
// por construção, abrir um pool com credencial em texto plano.
const tenantPool = createTenantPoolCache({
  create: (encryptedUrl) => createTenantPrismaClient(decryptSecret(encryptedUrl)),
  onEvict: (client) =>
    client.$disconnect().catch((e: unknown) =>
      console.error("Failed to disconnect evicted tenant client:", e)
    ),
});

/**
 * Obtém um cliente Prisma para o banco do tenant a partir de { tenantId, encryptedUrl }.
 * Keyado por tenantId (identidade estável). O segredo é decifrado dentro do cache via
 * decryptSecret — se não for ciphertext, lança e nenhum pool é aberto.
 */
export function getTenantPrisma(conn: TenantConnection): TenantPrismaClient {
  return tenantPool.getOrCreate(conn);
}
