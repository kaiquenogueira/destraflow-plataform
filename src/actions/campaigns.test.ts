
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
          targetTag: "HOT" as const,
        };
  
        mocks.create.mockResolvedValue({ id: "campaign-1" });
        mocks.findMany.mockResolvedValue([
          { id: "lead-1", name: "Test", phone: "123", interest: "Code" },
        ]);
  
        await createCampaign(payload);
  
        expect(mocks.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tag: "HOT" }
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
          where: {
            messages: {
              none: {
                campaign: {
                  status: {
                    in: ["SCHEDULED", "PROCESSING", "COMPLETED"],
                  },
                },
              },
            },
          },
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
    it("should return campaign with stats", async () => {
      mocks.findUnique.mockResolvedValue({ id: "c1" });
      mocks.groupBy.mockResolvedValue([
        { status: "SENT", _count: 10 },
        { status: "FAILED", _count: 2 },
      ]);

      const result = await getCampaignById("c1");

      expect(result.statusCounts).toEqual({
        SENT: 10,
        FAILED: 2,
      });
    });

    it("should throw if not found", async () => {
      mocks.findUnique.mockResolvedValue(null);
      await expect(getCampaignById("c1")).rejects.toThrow("Campanha não encontrada");
    });
  });

  describe("cancelCampaign", () => {
    it("should cancel scheduled campaign", async () => {
      mocks.findUnique.mockResolvedValue({ id: "c1", status: "SCHEDULED" });

      await cancelCampaign("c1");

      expect(mocks.$transaction).toHaveBeenCalled();
      // Verify transaction contents would be ideal but hard with mock
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
