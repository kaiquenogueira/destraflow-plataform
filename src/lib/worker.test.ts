
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { processAllTenantMessages, updateCampaignStatuses } from "./worker";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { decrypt } from "@/lib/encryption";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/evolution", () => ({
  createEvolutionClient: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: vi.fn((val) => val.replace("encrypted-", "")),
}));

describe("Worker", () => {
  const mockTenantPrisma = {
    campaignMessage: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    whatsAppContact: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    chatHistory: {
      create: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockEvolutionClient = {
    getInstanceStatus: vi.fn(),
    sendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getTenantPrisma as Mock).mockReturnValue(mockTenantPrisma);
    (createEvolutionClient as Mock).mockReturnValue(mockEvolutionClient);
    (decrypt as Mock).mockImplementation((val: string) => val.replace("encrypted-", ""));
    vi.spyOn(global, "setTimeout").mockImplementation((fn) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("processAllTenantMessages", () => {
    it("should process messages for valid tenants", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          evolutionPhone: "5511999999999",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead" },
          payload: "Hello",
          status: "PENDING",
          retryCount: 0,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue({ id: "contact-1" });

      const result = await processAllTenantMessages();

      expect(prisma.crmUser.findMany).toHaveBeenCalled();
      // getTenantPrisma agora recebe { tenantId, encryptedUrl } (decifra dentro do cache).
      expect(getTenantPrisma).toHaveBeenCalledWith({
        tenantId: "user-1",
        encryptedUrl: "encrypted-db-url",
      });
      expect(createEvolutionClient).toHaveBeenCalledWith("instance", "key");
      expect(mockEvolutionClient.sendMessage).toHaveBeenCalledWith(
        "5511988888888",
        "Hello"
      );
      expect(mockTenantPrisma.campaignMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg-1" },
          data: expect.objectContaining({ status: "SENT" }),
        })
      );
      expect(mockTenantPrisma.chatHistory.create).toHaveBeenCalled();
      expect(result.tenants).toBe(1);
      expect(result.results["User 1"].sent).toBe(1);
    });

    it("should process multiple tenants in parallel", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url-1",
          evolutionInstance: "encrypted-instance-1",
          evolutionApiKey: null,
          evolutionPhone: null,
        },
        {
          id: "user-2",
          name: "User 2",
          databaseUrl: "encrypted-db-url-2",
          evolutionInstance: "encrypted-instance-2",
          evolutionApiKey: null,
          evolutionPhone: null,
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([]);
      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });

      const result = await processAllTenantMessages();

      expect(result.tenants).toBe(2);
      expect(getTenantPrisma).toHaveBeenCalledTimes(2);
    });

    it("should handle disconnected instance", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        { id: "msg-1", status: "PENDING", retryCount: 0 },
      ]);
      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: false });

      const result = await processAllTenantMessages();

      expect(result.results["User 1"].errors).toContain("Instance instance not connected");
      expect(result.results["User 1"].processed).toBe(0);
    });

    it("should handle send errors and increment retryCount", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead" },
          payload: "Hello",
          status: "PENDING",
          retryCount: 0,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockRejectedValue(new Error("Send Error"));

      const result = await processAllTenantMessages();

      expect(mockTenantPrisma.campaignMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg-1" },
          data: expect.objectContaining({
            status: "FAILED",
            error: "Send Error",
            retryCount: 1,
          }),
        })
      );
      expect(result.results["User 1"].failed).toBe(1);
    });

    it("should dead-letter messages after MAX_RETRIES", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead" },
          payload: "Hello",
          status: "FAILED",
          retryCount: 2, // Already failed 2 times, next fail = dead letter
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockRejectedValue(new Error("Final Error"));

      const result = await processAllTenantMessages();

      expect(mockTenantPrisma.campaignMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg-1" },
          data: expect.objectContaining({
            status: "DEAD_LETTER",
            retryCount: 3,
          }),
        })
      );
      expect(result.results["User 1"].deadLettered).toBe(1);
    });

    it("should retry previously failed messages", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          evolutionPhone: "5511999999999",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead" },
          payload: "Hello",
          status: "FAILED",
          retryCount: 1,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockResolvedValue(true);
      mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue({ id: 1 });

      const result = await processAllTenantMessages();

      expect(result.results["User 1"].sent).toBe(1);
      expect(result.results["User 1"].retried).toBe(1);
    });

    it("should not mark a message as failed when the audit log persistence fails after a successful send", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          evolutionPhone: "5511999999999",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead" },
          payload: "Hello",
          status: "PENDING",
          retryCount: 0,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockResolvedValue(true);
      mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue({ id: "contact-1" });
      mockTenantPrisma.chatHistory.create.mockRejectedValue(new Error("history failed"));

      const result = await processAllTenantMessages();

      expect(result.results["User 1"].sent).toBe(1);
      expect(result.results["User 1"].failed).toBe(0);
      expect(mockTenantPrisma.campaignMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "msg-1" },
          data: expect.objectContaining({ status: "SENT" }),
        })
      );

      consoleSpy.mockRestore();
    });

    it("should reset an expired AI quota in the worker path (regression: tenant no longer blocked forever)", async () => {
      // Bug ao vivo: o worker nunca selecionava nem consultava aiLimitResetAt, então
      // um tenant no limite ficava bloqueado permanentemente no caminho automatizado.
      const pastReset = new Date(Date.now() - 24 * 60 * 60 * 1000);

      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          evolutionPhone: "5511999999999",
          aiMessagesUsed: 15,
          aiMessagesLimit: 15,
          aiLimitResetAt: pastReset,
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead", interest: null, aiSummary: null, notes: [] },
          payload: "Hello",
          status: "PENDING",
          retryCount: 0,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockResolvedValue(true);
      mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue({ id: "contact-1" });

      const result = await processAllTenantMessages();

      // Reset persistido: used=0 E aiLimitResetAt avançado (não fica no passado).
      expect(prisma.crmUser.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { aiMessagesUsed: { set: 0 }, aiLimitResetAt: { set: expect.any(Date) } },
      });
      // Tenant destravado: a mensagem foi enviada normalmente.
      expect(result.results["User 1"].sent).toBe(1);
    });

    it("creates the audit contact in CANONICAL form (Sprint 02 — no duplicate-per-format contact)", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        {
          id: "user-1",
          name: "User 1",
          databaseUrl: "encrypted-db-url",
          evolutionInstance: "encrypted-instance",
          evolutionApiKey: "encrypted-key",
          evolutionPhone: "5511999999999",
        },
      ]);

      mockTenantPrisma.campaignMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          lead: { phone: "5511988888888", name: "Lead", interest: null, aiSummary: null, notes: [] },
          payload: "Hello",
          status: "PENDING",
          retryCount: 0,
        },
      ]);

      mockEvolutionClient.getInstanceStatus.mockResolvedValue({ connected: true });
      mockEvolutionClient.sendMessage.mockResolvedValue(true);
      // Nenhum contato existe ainda: fast-path (findFirst) e fallback (findMany) vazios →
      // o worker cria o contato pela identidade canônica, não pelo telefone cru.
      mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue(null);
      mockTenantPrisma.whatsAppContact.findMany.mockResolvedValue([]);
      mockTenantPrisma.whatsAppContact.create.mockResolvedValue({ id: 99 });

      await processAllTenantMessages();

      expect(mockTenantPrisma.whatsAppContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          whatsapp: "+5511988888888",
          phoneNormalized: "+5511988888888",
          isManual: false,
        }),
      });
    });
  });

  describe("updateCampaignStatuses", () => {
    it("should update completed campaigns", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        { databaseUrl: "encrypted-db-url" },
      ]);

      mockTenantPrisma.campaign.findMany.mockResolvedValue([
        {
          id: "c1",
          status: "PROCESSING",
          messages: [],
          _count: { messages: 10 },
        },
      ]);

      const updated = await updateCampaignStatuses();

      expect(mockTenantPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { status: "COMPLETED" },
      });
      expect(updated).toBe(1);
    });

    it("should update scheduled campaigns to processing", async () => {
      (prisma.crmUser.findMany as Mock).mockResolvedValue([
        { databaseUrl: "encrypted-db-url" },
      ]);

      mockTenantPrisma.campaign.findMany.mockResolvedValue([
        {
          id: "c2",
          status: "SCHEDULED",
          scheduledAt: new Date(Date.now() - 1000),
          messages: [{ id: "m1" }],
          _count: { messages: 10 },
        },
      ]);

      const updated = await updateCampaignStatuses();

      expect(mockTenantPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: "c2" },
        data: { status: "PROCESSING" },
      });
      expect(updated).toBe(1);
    });
  });
});
