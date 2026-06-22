
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLead,
  updateLead,
  updateLeadTag,
  deleteLead,
  getLeads,
  getLeadById,
  getLeadsByTag,
  importLeadsFromCSV,
} from "./leads";

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  requireTenantContext: vi.fn(),
  getOptionalTenantContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireTenantContext, getOptionalTenantContext } from "@/lib/tenant";

describe("Leads Actions", () => {
  const mockPrisma = {
    lead: {
      create: vi.fn(),
      createMany: vi.fn(),
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
    (requireTenantContext as any).mockResolvedValue(mockContext);
    (getOptionalTenantContext as any).mockResolvedValue(mockContext);
  });

  describe("createLead", () => {
    it("should create a lead successfully", async () => {
      // Input NÃO-canônico (sem +55): prova que createLead aplica canonicalizePhone,
      // não apenas copia o phone cru para phoneNormalized.
      const input = {
        name: "Test Lead",
        phone: "11999999999",
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

      // Sprint 02: createLead persiste a forma canônica em phoneNormalized (identidade de telefone).
      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: { ...input, phoneNormalized: "+5511999999999" },
      });
      expect(result.success).toBe(true);
      expect(result.lead).toBeDefined();
    });

    // Invariante "sem DB → aborta" agora coberto 1x no resolver (tenant.test.ts),
    // não reasserido por action (Sprint 05).

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

    it("recomputes phoneNormalized when phone changes (Sprint 02 — no stale canonical)", async () => {
      mockPrisma.lead.update.mockResolvedValue({ id: "lead-1" });

      await updateLead({ id: "lead-1", phone: "5511999999999" });

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: { phone: "5511999999999", phoneNormalized: "+5511999999999" },
      });
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
        aiUsage: {
          used: 0,
          limit: 15
        }
      });
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { updatedAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should return empty result for admin without db", async () => {
      (getOptionalTenantContext as any).mockResolvedValue(null);

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
      (getOptionalTenantContext as any).mockResolvedValue(null);

      const result = await getLeadsByTag();

      expect(result).toEqual({});
    });
  });

  describe("importLeadsFromCSV", () => {
    it("dedupes by canonical form (batch + existing) and persists phoneNormalized", async () => {
      // Existente no banco (forma crua) que canonicaliza para +5511977777777.
      mockPrisma.lead.findMany.mockResolvedValue([{ phone: "5511977777777" }]);
      mockPrisma.lead.createMany.mockResolvedValue({ count: 1 });

      const result = await importLeadsFromCSV([
        { name: "Keep", phone: "11999999999" },        // novo → importa
        { name: "Dup batch", phone: "+55 11 99999-9999" }, // mesmo nº, formato diferente → skip
        { name: "Dup existing", phone: "(11) 97777-7777" }, // casa existente → skip
      ]);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(2);
      expect(mockPrisma.lead.createMany).toHaveBeenCalledWith({
        data: [
          {
            name: "Keep",
            phone: "+5511999999999",
            phoneNormalized: "+5511999999999",
            interest: undefined,
            tag: "NEW",
          },
        ],
      });
    });
  });
});
