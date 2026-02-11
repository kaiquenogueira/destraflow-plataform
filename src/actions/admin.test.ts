
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from "./admin";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { encrypt, decrypt } from "@/lib/encryption";

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((val) => `encrypted-${val}`),
  decrypt: vi.fn((val) => val.replace("encrypted-", "")),
  hashString: vi.fn((val) => `hashed-${val}`),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Admin Actions", () => {
  const mockAdminSession = {
    user: {
      id: "admin-1",
    },
  };

  const mockUserSession = {
    user: {
      id: "user-1",
    },
  };

  const mockAdminUser = {
    id: "admin-1",
    role: "ADMIN",
    email: "admin@example.com",
    name: "Admin",
  };

  const mockUser = {
    id: "user-1",
    role: "USER",
    email: "user@example.com",
    name: "User",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (hash as any).mockResolvedValue("hashed-password");
    (encrypt as any).mockImplementation((val: string) => `encrypted-${val}`);
    (decrypt as any).mockImplementation((val: string) => val.replace("encrypted-", ""));
  });

  describe("Permission Checks", () => {
    it("should throw error if not authenticated", async () => {
      (getServerSession as any).mockResolvedValue(null);
      await expect(getUsers()).rejects.toThrow("Não autorizado");
    });

    it("should throw error if not admin", async () => {
      (getServerSession as any).mockResolvedValue(mockUserSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockUser);

      await expect(getUsers()).rejects.toThrow("Acesso negado. Apenas administradores.");
    });
  });

  describe("getUsers", () => {
    it("should return users for admin", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);
      (prisma.crmUser.findMany as any).mockResolvedValue([mockAdminUser, mockUser]);

      const users = await getUsers();

      expect(users).toHaveLength(2);
      expect(prisma.crmUser.findMany).toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    it("should return decrypted user data", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === "admin-1") return Promise.resolve(mockAdminUser);
        if (where.id === "target-user")
          return Promise.resolve({
            ...mockUser,
            id: "target-user",
            databaseUrl: "encrypted-url",
            evolutionInstance: "encrypted-instance",
            evolutionApiKey: "encrypted-key",
          });
        return Promise.resolve(null);
      });

      const user = await getUserById("target-user");

      expect(user.databaseUrl).toBe("url");
      expect(user.evolutionInstance).toBe("instance");
      expect(user.evolutionApiKey).toBe("key");
    });
  });

  describe("createUser", () => {
    it("should create user with encrypted data", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === "admin-1") return Promise.resolve(mockAdminUser);
        return Promise.resolve(null); // No existing user
      });
      (prisma.crmUser.create as any).mockResolvedValue({ id: "new-user" });

      const input = {
        email: "new@example.com",
        password: "password123",
        name: "New User",
        role: "USER" as const,
        databaseUrl: "db-url",
        evolutionInstance: "instance",
        evolutionApiKey: "key",
      };

      await createUser(input);

      expect(prisma.crmUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "new@example.com",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          password: "hashed-password",
        }),
      });
    });

    it("should throw if email exists", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === "admin-1") return Promise.resolve(mockAdminUser);
        if (where.email === "new@example.com") return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      const input = {
        email: "new@example.com",
        password: "password123",
        name: "New User",
        role: "USER" as const,
      };

      await expect(createUser(input)).rejects.toThrow("Email já cadastrado");
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

      await updateUser({
        id: "target-user",
        name: "Updated Name",
      });

      expect(prisma.crmUser.update).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: { name: "Updated Name" },
      });
    });

    it("should encrypt sensitive data on update", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

      await updateUser({
        id: "target-user",
        databaseUrl: "new-url",
      });

      expect(prisma.crmUser.update).toHaveBeenCalledWith({
        where: { id: "target-user" },
        data: expect.objectContaining({
          databaseUrl: "encrypted-new-url",
        }),
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

      await deleteUser("target-user");

      expect(prisma.crmUser.delete).toHaveBeenCalledWith({
        where: { id: "target-user" },
      });
    });

    it("should prevent self deletion", async () => {
      (getServerSession as any).mockResolvedValue(mockAdminSession);
      (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

      await expect(deleteUser("admin-1")).rejects.toThrow(
        "Você não pode deletar sua própria conta"
      );
    });
  });

  describe("resetUserPassword", () => {
    it("should hash new password", async () => {
        (getServerSession as any).mockResolvedValue(mockAdminSession);
        (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

        await resetUserPassword("user-1", "newpassword");

        expect(hash).toHaveBeenCalledWith("newpassword", 10);
        expect(prisma.crmUser.update).toHaveBeenCalledWith({
            where: { id: "user-1" },
            data: { password: "hashed-password" }
        });
    });

    it("should validate password length", async () => {
        (getServerSession as any).mockResolvedValue(mockAdminSession);
        (prisma.crmUser.findUnique as any).mockResolvedValue(mockAdminUser);

        await expect(resetUserPassword("user-1", "123")).rejects.toThrow("Senha deve ter pelo menos 6 caracteres");
    });
  });
});
