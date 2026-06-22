import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findUnique: vi.fn(),
    },
  },
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((value: string) => value.replace("encrypted-", "")),
}));

describe("Tenant Context", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should decrypt the tenant database URL before creating the Prisma client", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma, getTenantPrisma } = await import("@/lib/prisma");
    const { getOptionalTenantContext } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "USER",
      databaseUrl: "encrypted-postgresql://tenant-db",
      aiMessagesUsed: 3,
      aiMessagesLimit: 15,
      aiLimitResetAt: null,
    });
    (getTenantPrisma as any).mockReturnValue({ tenant: true });

    const result = await getOptionalTenantContext();

    // Resolve por { tenantId, encryptedUrl }; a decifragem estrita vive dentro do pool.
    expect(getTenantPrisma).toHaveBeenCalledWith({
      tenantId: "user-1",
      encryptedUrl: "encrypted-postgresql://tenant-db",
    });
    expect(result).toEqual({
      userId: "user-1",
      userRole: "USER",
      tenantPrisma: { tenant: true },
      aiQuota: { used: 3, limit: 15, resetAt: null },
    });
  });

  it("should return null when the user has no database configured", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma, getTenantPrisma } = await import("@/lib/prisma");
    const { getOptionalTenantContext } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({
      user: { id: "admin-1" },
    });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      databaseUrl: null,
    });

    const result = await getOptionalTenantContext();

    expect(result).toBeNull();
    expect(getTenantPrisma).not.toHaveBeenCalled();
  });

  it("requireTenantContext resolves the context when a database is configured", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma, getTenantPrisma } = await import("@/lib/prisma");
    const { requireTenantContext } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "USER",
      databaseUrl: "encrypted-postgresql://tenant-db",
      aiMessagesUsed: 3,
      aiMessagesLimit: 15,
      aiLimitResetAt: null,
    });
    (getTenantPrisma as any).mockReturnValue({ tenant: true });

    const result = await requireTenantContext();

    // O invariante "sem DB → aborta" agora é testado UMA vez aqui, no resolver,
    // em vez de reasserido em cada action (Sprint 05).
    expect(result).toMatchObject({
      userId: "user-1",
      userRole: "USER",
      tenantPrisma: { tenant: true },
    });
  });

  it("requireTenantContext throws NO_TENANT_DB_MESSAGE when no database is configured", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma, getTenantPrisma } = await import("@/lib/prisma");
    const { requireTenantContext, NO_TENANT_DB_MESSAGE } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({ user: { id: "admin-1" } });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      databaseUrl: null,
    });

    await expect(requireTenantContext()).rejects.toThrow(NO_TENANT_DB_MESSAGE);
    expect(getTenantPrisma).not.toHaveBeenCalled();
  });
});
