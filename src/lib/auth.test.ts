
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authConfig } from "./auth";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";

// Mock dependencies
vi.mock("./prisma", () => ({
  prisma: {
    crmUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

describe("Auth Config", () => {
  describe("CredentialsProvider authorize", () => {
    // Access the authorize function from the configuration
    // providers[0] is CredentialsProvider
    const credentialsProvider = authConfig.providers.find(
      (p: any) => p.id === "credentials" || p.name === "credentials"
    ) as any;

    const authorize = credentialsProvider?.options?.authorize || credentialsProvider?.authorize;

    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should throw error if email or password is missing", async () => {
      await expect(authorize({})).rejects.toThrow("Email e senha são obrigatórios");
      await expect(authorize({ email: "test@example.com" })).rejects.toThrow(
        "Email e senha são obrigatórios"
      );
    });

    it("should throw error if user not found", async () => {
      (prisma.crmUser.findUnique as any).mockResolvedValue(null);

      await expect(
        authorize({ email: "test@example.com", password: "password" })
      ).rejects.toThrow("Email ou senha inválidos");
    });

    it("should throw error if password does not match", async () => {
      (prisma.crmUser.findUnique as any).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: "hashed-password",
      });
      (compare as any).mockResolvedValue(false);

      await expect(
        authorize({ email: "test@example.com", password: "password" })
      ).rejects.toThrow("Email ou senha inválidos");
    });

    it("should return user if credentials are valid", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
        password: "hashed-password",
      };

      (prisma.crmUser.findUnique as any).mockResolvedValue(mockUser);
      (compare as any).mockResolvedValue(true);

      const result = await authorize({
        email: "test@example.com",
        password: "password",
      });

      expect(result).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      });
    });
  });

  describe("callbacks", () => {
    describe("jwt", () => {
      it("should add user info to token on sign in", async () => {
        const token = {};
        const user = { id: "user-1", role: "ADMIN" };
        
        const result = await authConfig.callbacks?.jwt?.({ token, user, account: null as any });

        expect(result).toEqual({ id: "user-1", role: "ADMIN" });
      });

      it("should return token as is on subsequent calls", async () => {
        const token = { id: "user-1", role: "ADMIN" };
        
        const result = await authConfig.callbacks?.jwt?.({ token, user: undefined as any, account: null as any });

        expect(result).toEqual(token);
      });
    });

    describe("session", () => {
      it("should add token info to session user", async () => {
        const session = { user: { name: "Test" }, expires: "date" };
        const token = { id: "user-1", role: "ADMIN" };

        const result = await authConfig.callbacks?.session?.({
          session: session as any,
          token,
          user: null as any
        } as any);

        expect(result?.user).toEqual({
          name: "Test",
          id: "user-1",
          role: "ADMIN",
        });
      });
    });
  });
});
