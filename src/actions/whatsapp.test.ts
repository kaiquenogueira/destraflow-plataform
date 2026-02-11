
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWhatsAppStatus,
  generateQRCode,
  disconnectWhatsApp,
  saveEvolutionConfig,
} from "./whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { createEvolutionClient } from "@/lib/evolution";
import { encrypt, decrypt } from "@/lib/encryption";

// Mock dependencies
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/evolution", () => ({
  createEvolutionClient: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((val) => `encrypted-${val}`),
  decrypt: vi.fn((val) => val.replace("encrypted-", "")),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("WhatsApp Actions", () => {
  const mockSession = {
    user: {
      id: "user-1",
    },
  };

  const mockUser = {
    id: "user-1",
    evolutionInstance: "encrypted-instance",
    evolutionApiKey: "encrypted-key",
  };

  const mockEvolutionClient = {
    getInstanceStatus: vi.fn(),
    generateQRCode: vi.fn(),
    disconnect: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (getServerSession as any).mockResolvedValue(mockSession);
    (prisma.crmUser.findUnique as any).mockResolvedValue(mockUser);
    (createEvolutionClient as any).mockReturnValue(mockEvolutionClient);
    (encrypt as any).mockImplementation((val: string) => `encrypted-${val}`);
    (decrypt as any).mockImplementation((val: string) => val.replace("encrypted-", ""));
  });

  describe("getWhatsAppStatus", () => {
    it("should return status when configured", async () => {
      mockEvolutionClient.getInstanceStatus.mockResolvedValue({
        connected: true,
        state: "open",
      });

      const result = await getWhatsAppStatus();

      expect(prisma.crmUser.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: expect.anything(),
      });
      expect(createEvolutionClient).toHaveBeenCalledWith("instance", "key");
      expect(result).toEqual({
        success: true,
        connected: true,
        state: "open",
      });
    });

    it("should return not configured error if no instance in db", async () => {
      (prisma.crmUser.findUnique as any).mockResolvedValue({
        ...mockUser,
        evolutionInstance: null,
      });

      const result = await getWhatsAppStatus();

      expect(result).toEqual({
        success: false,
        connected: false,
        state: "not_configured",
        error: "Instância do WhatsApp não configurada",
      });
    });

    it("should handle client errors", async () => {
      mockEvolutionClient.getInstanceStatus.mockRejectedValue(new Error("API Error"));

      const result = await getWhatsAppStatus();

      expect(result).toEqual({
        success: false,
        connected: false,
        state: "not_configured",
        error: "API Error",
      });
    });
  });

  describe("generateQRCode", () => {
    it("should return QR code", async () => {
      mockEvolutionClient.generateQRCode.mockResolvedValue({
        base64: "qr-code",
        pairingCode: "123",
      });

      const result = await generateQRCode();

      expect(result).toEqual({
        success: true,
        qrCode: {
          base64: "qr-code",
          pairingCode: "123",
        },
      });
    });

    it("should handle errors", async () => {
      mockEvolutionClient.generateQRCode.mockRejectedValue(new Error("QR Error"));

      const result = await generateQRCode();

      expect(result).toEqual({
        success: false,
        qrCode: null,
        error: "QR Error",
      });
    });
  });

  describe("disconnectWhatsApp", () => {
    it("should disconnect successfully", async () => {
      mockEvolutionClient.disconnect.mockResolvedValue(true);

      const result = await disconnectWhatsApp();

      expect(mockEvolutionClient.disconnect).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe("saveEvolutionConfig", () => {
    it("should save config", async () => {
      await saveEvolutionConfig("new-instance", "new-key");

      expect(prisma.crmUser.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          evolutionInstance: "encrypted-new-instance",
          evolutionApiKey: "encrypted-new-key",
        },
      });
    });
  });
});
