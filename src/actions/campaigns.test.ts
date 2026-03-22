
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCampaign,
  getLeadsForCampaignSelection,
  getCampaigns,
  getCampaignById,
  cancelCampaign,
  sendUnitMessage,
  getCampaignMetrics,
} from "./campaigns";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(3),
  template: z.string().min(5),
  scheduledAt: z.date().refine((date) => date >= new Date(), {
    message: "A data deve ser no futuro",
  }),
});
import { addMinutes } from "date-fns";

// Define mocks
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
  $transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn().mockResolvedValue({
    tenantPrisma: {
      lead: {
        findMany: mocks.findMany,
        findUnique: mocks.findUnique,
        count: mocks.count,
      },
      campaign: {
        create: mocks.create,
        findMany: mocks.findMany,
        count: mocks.count,
        findUnique: mocks.findUnique,
        update: mocks.update,
      },
      campaignMessage: {
        createMany: mocks.createMany,
        create: mocks.create,
        groupBy: mocks.groupBy,
        updateMany: mocks.updateMany,
        count: mocks.count,
        findMany: mocks.findMany, // Added this
      },
      $transaction: mocks.$transaction,
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { getTenantContext } from "@/lib/tenant";

describe("Campaign Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const mockNow = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(mockNow);
    (getTenantContext as any).mockResolvedValue({
      tenantPrisma: {
        lead: {
          findMany: mocks.findMany,
          findUnique: mocks.findUnique,
          count: mocks.count,
        },
        campaign: {
          create: mocks.create,
          findMany: mocks.findMany,
          count: mocks.count,
          findUnique: mocks.findUnique,
          update: mocks.update,
        },
        campaignMessage: {
          createMany: mocks.createMany,
          create: mocks.create,
          groupBy: mocks.groupBy,
          updateMany: mocks.updateMany,
          count: mocks.count,
          findMany: mocks.findMany, // Added this
        },
        $transaction: mocks.$transaction,
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createCampaign", () => {
    it("should reject campaign scheduled less than 10 minutes in the future", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const invalidDate = addMinutes(now, 5);

      const payload = {
        name: "Test Campaign",
        template: "Hello {{nome}} needs to be longer than 10 chars",
        scheduledAt: invalidDate,
        leadIds: ["lead-1"],
      };

      await expect(createCampaign(payload)).rejects.toThrow();
    });

    it("should create campaign and messages", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const validDate = addMinutes(now, 15);

      const payload = {
        name: "Test Campaign",
        template: "Hello {{nome}}",
        scheduledAt: validDate,
        leadIds: ["lead-1"],
      };

      mocks.create.mockResolvedValue({ id: "campaign-1" });
      mocks.findMany.mockResolvedValue([
        { id: "lead-1", name: "Test", phone: "123", interest: "Code" },
      ]);

      const result = await createCampaign(payload);

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Test Campaign",
            status: "SCHEDULED",
          }),
        })
      );

      expect(mocks.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            campaignId: "campaign-1",
            leadId: "lead-1",
            payload: "Hello Test",
            status: "PENDING",
          }),
        ]),
      });

      expect(result.success).toBe(true);
    });

    it("should create campaign with targetTag", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const validDate = addMinutes(now, 15);

      const payload = {
        name: "Test Campaign",
        template: "Hello {{nome}}",
        scheduledAt: validDate,
        targetTag: "MEETING" as const,
      };

      mocks.create.mockResolvedValue({ id: "campaign-1" });
      mocks.findMany.mockResolvedValue([
        { id: "lead-1", name: "Test", phone: "123", interest: "Code" },
      ]);

      await createCampaign(payload);

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tag: "MEETING" }
        })
      );
    });
  });

  describe("getLeadsForCampaignSelection", () => {
    it("should query leads filtering out those in active campaigns", async () => {
      mocks.findMany.mockResolvedValue([]);

      await getLeadsForCampaignSelection();

      expect(mocks.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            messages: {
                where: {
                    campaign: {
                        status: { in: ["SCHEDULED", "PROCESSING", "COMPLETED"] }
                    }
                },
                select: {
                    campaign: { select: { name: true } },
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("getCampaigns", () => {
    it("should return campaigns with pagination", async () => {
      mocks.findMany.mockResolvedValue([{ id: "c1" }]);
      mocks.count.mockResolvedValue(1);

      const result = await getCampaigns({ page: 1, limit: 10 });

      expect(result).toEqual({
        campaigns: [{ id: "c1" }],
        total: 1,
        pages: 1,
        currentPage: 1,
      });
    });

    it("should handle no db configured", async () => {
      (getTenantContext as any).mockResolvedValue(null);
      const result = await getCampaigns();
      expect(result.noDatabaseConfigured).toBe(true);
    });
  });

  describe("getCampaignById", () => {
    it("should return campaign with stats and messages (supporting CUIDs and complex query)", async () => {
      const cuid = "cmm9fzx6c000004jsculodr2a";
      
      // Mock para findUnique (Campanha)
      mocks.findUnique.mockResolvedValue({ id: cuid, name: "Campaign 1" });
      
      // Mock para findMany (Mensagens)
      mocks.findMany.mockResolvedValue([
        { id: "msg1", status: "SENT", lead: { name: "Lead 1", phone: "123" } }
      ]);

      // Mock para count (Total mensagens)
      mocks.count.mockResolvedValue(12);

      // Mock para groupBy (Status counts)
      mocks.groupBy.mockResolvedValue([
        { status: "SENT", _count: 10 },
        { status: "FAILED", _count: 2 },
      ]);

      const result = await getCampaignById(cuid);

      // Verifica se o ID (CUID) foi aceito
      expect(result.id).toBe(cuid);
      
      // Verifica se a estrutura combinada está correta
      expect(result.messages).toHaveLength(1);
      expect(result._count).toEqual({ messages: 12 });
      expect(result.statusCounts).toEqual({
        SENT: 10,
        FAILED: 2,
      });

      // Verifica se as chamadas foram feitas (a ordem pode variar devido ao Promise.all, mas devem ter ocorrido)
      expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: cuid } }));
      expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: cuid } }));
      expect(mocks.count).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: cuid } }));
      expect(mocks.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: cuid } }));
    });

    it("should throw if not found", async () => {
      mocks.findUnique.mockResolvedValue(null);
      // As outras chamadas podem ocorrer em paralelo, então precisamos mockar para não quebrar
      mocks.findMany.mockResolvedValue([]);
      mocks.count.mockResolvedValue(0);
      mocks.groupBy.mockResolvedValue([]);
      
      await expect(getCampaignById("cmm9fzx6c000004jsculodr2a")).rejects.toThrow("Campanha não encontrada");
    });
  });

  describe("cancelCampaign", () => {
    it("should cancel scheduled campaign with CUID", async () => {
      const cuid = "cmm9fzx6c000004jsculodr2a";
      mocks.findUnique.mockResolvedValue({ id: cuid, status: "SCHEDULED" });

      await cancelCampaign(cuid);

      expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: cuid } }));
      expect(mocks.$transaction).toHaveBeenCalled();
    });

    it("should throw if not scheduled", async () => {
      mocks.findUnique.mockResolvedValue({ id: "c1", status: "COMPLETED" });
      await expect(cancelCampaign("c1")).rejects.toThrow(
        "Apenas campanhas agendadas podem ser canceladas"
      );
    });
  });

  describe("sendUnitMessage", () => {
    it("should create immediate message", async () => {
      mocks.findUnique.mockResolvedValue({ id: "lead-1", name: "Test" });
      mocks.create.mockResolvedValue({ id: "msg-1" });

      await sendUnitMessage("lead-1", "Hello {{nome}}");

      expect(mocks.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: "lead-1",
          status: "PENDING",
          priority: 1,
          payload: "Hello Test",
        }),
      });
    });
  });

  describe("createCampaignSchema", () => {
    it("should parse scheduled date properly", async () => {
      const pastDate = new Date(Date.now() - 10000);
      const futureDate = new Date(Date.now() + 10000);

      const data = {
        name: "Campaign 1",
        template: "Hello {{nome}}",
        scheduledAt: futureDate,
      };

      expect(() => createCampaignSchema.parse(data)).not.toThrow();

      const pastData = {
        ...data,
        scheduledAt: pastDate,
      };

      expect(() => createCampaignSchema.parse(pastData)).toThrow();
    });
  });

  describe("generateAIPersonalizedMessage", () => {
    it("should generate AI personalized message successfully", async () => {
      // Configurar environment mock antes de qualquer outra coisa
      const originalEnv = process.env;
      process.env = { ...originalEnv, DATABASE_URL: "postgresql://fake:fake@localhost:5432/fake" };
      
      (getTenantContext as any).mockResolvedValue({
        tenantPrisma: { lead: { findUnique: mocks.findUnique } },
        userId: "user-1",
        aiMessagesUsed: 5,
        aiMessagesLimit: 15
      });

      mocks.findUnique.mockResolvedValue({
        id: "lead-1",
        name: "João",
        interest: "Software",
        aiSummary: "Quer desconto",
        notes: [{ content: "Ligar depois" }]
      });

      // Mock the module before importing campaigns
      vi.mock("@/lib/prisma", () => ({
        prisma: {
          crmUser: {
            update: vi.fn().mockResolvedValue({}),
          }
        }
      }));

      // Mock the personalizer
      const { generateAIPersonalizedMessage } = await import("./campaigns");
      
      // We need to mock the underlying personalizer class to avoid actual API calls
      vi.mock("@/services/ai/campaign-personalizer", () => {
        const MockCampaignPersonalizer = vi.fn();
        MockCampaignPersonalizer.prototype.personalize = vi.fn().mockResolvedValue("Mensagem com IA para João");
        return { CampaignPersonalizer: MockCampaignPersonalizer };
      });

      const result = await generateAIPersonalizedMessage("lead-1", "Template original");

      expect(result.success).toBe(true);
      // Restaurar o env original
      process.env = originalEnv;
    });
  });

  describe("getCampaignMetrics", () => {
    it("should return counts", async () => {
      mocks.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // sent
        .mockResolvedValueOnce(2); // failed

      const result = await getCampaignMetrics();

      expect(result).toEqual({
        pending: 5,
        sent: 10,
        failed: 2,
      });
    });
  });
});
