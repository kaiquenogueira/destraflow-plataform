
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLead,
  updateLead,
  updateLeadTag,
  deleteLead,
  getLeads,
  getLeadById,
  getLeadsByTag,
} from "./leads";

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getTenantContext } from "@/lib/tenant";

describe("Leads Actions", () => {
  const mockPrisma = {
    lead: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
    },
  };

  const mockContext = {
    userId: "user-123",
    userRole: "USER",
    tenantPrisma: mockPrisma,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (getTenantContext as any).mockResolvedValue(mockContext);
  });

  describe("createLead", () => {
    it("should create a lead successfully", async () => {
      const input = {
        name: "Test Lead",
        phone: "+5511999999999",
        tag: "NEW" as const,
        interest: "Product A",
      };

      mockPrisma.lead.create.mockResolvedValue({
        id: "lead-1",
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createLead(input);

      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: input,
      });
      expect(result.success).toBe(true);
      expect(result.lead).toBeDefined();
    });

    it("should throw error if database is not configured", async () => {
      (getTenantContext as any).mockResolvedValue(null);

      await expect(
        createLead({
          name: "Test",
          phone: "+5511999999999",
          tag: "NEW",
        })
      ).rejects.toThrow("Banco de dados não configurado");
    });

    it("should validate input", async () => {
      await expect(
        createLead({
          name: "T", // Too short
          phone: "invalid", // Invalid phone
          tag: "NEW",
        })
      ).rejects.toThrow();
    });
  });

  describe("updateLead", () => {
    it("should update a lead successfully", async () => {
      const input = {
        id: "lead-1",
        name: "Updated Name",
      };

      mockPrisma.lead.update.mockResolvedValue({
        id: "lead-1",
        name: "Updated Name",
        phone: "+5511999999999",
        tag: "NEW",
      });

      const result = await updateLead(input);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: { name: "Updated Name" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateLeadTag", () => {
    it("should update lead tag successfully", async () => {
      mockPrisma.lead.update.mockResolvedValue({
        id: "lead-1",
        tag: "MEETING",
      });

      const result = await updateLeadTag("lead-1", "MEETING");

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: { tag: "MEETING" },
      });
      expect(result.success).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockPrisma.lead.update.mockRejectedValue(new Error("DB Error"));

      // Spy on console.error to suppress output
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

      await expect(updateLeadTag("lead-1", "MEETING")).rejects.toThrow(
        "Erro ao atualizar tag do lead"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("deleteLead", () => {
    it("should delete a lead successfully", async () => {
      mockPrisma.lead.delete.mockResolvedValue({ id: "lead-1" });

      const result = await deleteLead("lead-1");

      expect(mockPrisma.lead.delete).toHaveBeenCalledWith({
        where: { id: "lead-1" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("getLeads", () => {
    it("should return leads with pagination", async () => {
      const mockLeads = [
        { id: "lead-1", name: "Lead 1" },
        { id: "lead-2", name: "Lead 2" },
      ];

      mockPrisma.lead.findMany.mockResolvedValue(mockLeads);
      mockPrisma.lead.count.mockResolvedValue(2);

      const result = await getLeads({ page: 1, limit: 10 });

      expect(result).toEqual({
        leads: mockLeads,
        total: 2,
        pages: 1,
        currentPage: 1,
      });
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should return empty result for admin without db", async () => {
      (getTenantContext as any).mockResolvedValue(null);

      const result = await getLeads();

      expect(result).toEqual({
        leads: [],
        total: 0,
        pages: 0,
        currentPage: 1,
        noDatabaseConfigured: true,
      });
    });

    it("should filter by search and tag", async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      mockPrisma.lead.count.mockResolvedValue(0);

      await getLeads({ search: "John", tag: "MEETING" });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tag: "MEETING",
            OR: [
              { name: { contains: "John", mode: "insensitive" } },
              { phone: { contains: "John" } },
            ],
          }),
        })
      );
    });
  });

  describe("getLeadById", () => {
    it("should return lead with messages", async () => {
      const mockLead = {
        id: "lead-1",
        name: "Lead 1",
        messages: [],
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead);

      const result = await getLeadById("lead-1");

      expect(result).toEqual(mockLead);
      expect(mockPrisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
    });

    it("should throw error if lead not found", async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      await expect(getLeadById("lead-1")).rejects.toThrow("Lead não encontrado");
    });
  });

  describe("getLeadsByTag", () => {
    it("should return counts by tag", async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { tag: "MEETING", _count: 5 },
        { tag: "NEW", _count: 3 },
      ]);

      const result = await getLeadsByTag();

      expect(result).toEqual({
        MEETING: 5,
        NEW: 3,
      });
    });

    it("should return empty object if no context", async () => {
      (getTenantContext as any).mockResolvedValue(null);

      const result = await getLeadsByTag();

      expect(result).toEqual({});
    });
  });
});
