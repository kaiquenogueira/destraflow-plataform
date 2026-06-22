import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  validatePrincipal: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authConfig: {} }));
vi.mock("@/lib/principal", () => ({ validatePrincipal: mocks.validatePrincipal }));

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "x" } });
  });

  it("throws 'Acesso negado' for a non-admin principal", async () => {
    const { requireAdmin } = await import("./admin-auth");
    mocks.validatePrincipal.mockResolvedValue({ id: "x", role: "USER" });

    await expect(requireAdmin()).rejects.toThrow("Acesso negado. Apenas administradores.");
  });

  it("returns the principal id for an admin", async () => {
    const { requireAdmin } = await import("./admin-auth");
    mocks.validatePrincipal.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    await expect(requireAdmin()).resolves.toBe("admin-1");
  });
});
