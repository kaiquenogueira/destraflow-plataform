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
    const { getTenantContext } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "USER",
      databaseUrl: "encrypted-postgresql://tenant-db",
    });
    (getTenantPrisma as any).mockReturnValue({ tenant: true });

    const result = await getTenantContext();

    expect(getTenantPrisma).toHaveBeenCalledWith("postgresql://tenant-db");
    expect(result).toEqual({
      userId: "user-1",
      userRole: "USER",
      tenantPrisma: { tenant: true },
    });
  });

  it("should return null when the user has no database configured", async () => {
    const { getServerSession } = await import("next-auth");
    const { prisma, getTenantPrisma } = await import("@/lib/prisma");
    const { getTenantContext } = await import("./tenant");

    (getServerSession as any).mockResolvedValue({
      user: { id: "admin-1" },
    });
    (prisma.crmUser.findUnique as any).mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      databaseUrl: null,
    });

    const result = await getTenantContext();

    expect(result).toBeNull();
    expect(getTenantPrisma).not.toHaveBeenCalled();
  });
});
