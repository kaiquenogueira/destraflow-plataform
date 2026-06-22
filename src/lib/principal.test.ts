import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { validatePrincipal } from "./principal";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findUnique: vi.fn(),
    },
  },
}));

const sessionFor = (id: string): Session => ({ user: { id }, expires: "" });

describe("validatePrincipal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 'Não autorizado' when there is no session", async () => {
    await expect(validatePrincipal(null)).rejects.toThrow("Não autorizado");
    expect(prisma.crmUser.findUnique).not.toHaveBeenCalled();
  });

  it("throws 'Usuário não encontrado' when the user does not exist", async () => {
    vi.mocked(prisma.crmUser.findUnique).mockResolvedValue(null);

    await expect(validatePrincipal(sessionFor("ghost"))).rejects.toThrow(
      "Usuário não encontrado"
    );
  });

  it("returns the validated principal for a real session", async () => {
    vi.mocked(prisma.crmUser.findUnique).mockResolvedValue({
      id: "user-1",
      role: "USER",
    } as Awaited<ReturnType<typeof prisma.crmUser.findUnique>>);

    const principal = await validatePrincipal(sessionFor("user-1"));

    expect(principal).toEqual({ id: "user-1", role: "USER" });
  });
});
