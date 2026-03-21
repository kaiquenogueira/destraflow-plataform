import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNote, getNotesByLeadId, deleteNote } from "./notes";
import { getTenantContext } from "@/lib/tenant";

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Notes Actions", () => {
  const mockTenantPrisma = {
    leadNote: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (getTenantContext as any).mockResolvedValue({
      tenantPrisma: mockTenantPrisma,
    });
  });

  describe("createNote", () => {
    it("should sanitize XSS from note content before saving", async () => {
      mockTenantPrisma.leadNote.create.mockResolvedValue({
        id: "note-1",
        leadId: "lead-1",
        content: "&lt;script&gt;alert('xss')&lt;/script&gt;Hello",
      });

      const input = {
        leadId: "lead-1",
        content: "<script>alert('xss')</script>Hello",
      };

      await createNote(input);

      // Verificamos se o método create foi chamado com o texto higienizado
      expect(mockTenantPrisma.leadNote.create).toHaveBeenCalledWith({
        data: {
          leadId: "lead-1",
          content: "&lt;script&gt;alert('xss')&lt;/script&gt;Hello",
        },
      });
    });

    it("should throw error if database is not configured", async () => {
      (getTenantContext as any).mockResolvedValue(null);

      await expect(
        createNote({
          leadId: "lead-1",
          content: "Test note",
        })
      ).rejects.toThrow("Banco de dados não configurado");
    });
  });

  describe("getNotesByLeadId", () => {
    it("should return empty array if no context", async () => {
      (getTenantContext as any).mockResolvedValue(null);
      const notes = await getNotesByLeadId("lead-1");
      expect(notes).toEqual([]);
    });

    it("should fetch notes for a lead", async () => {
      const mockNotes = [
        { id: "note-1", content: "Note 1" },
        { id: "note-2", content: "Note 2" },
      ];
      mockTenantPrisma.leadNote.findMany.mockResolvedValue(mockNotes);

      const result = await getNotesByLeadId("lead-1");

      expect(mockTenantPrisma.leadNote.findMany).toHaveBeenCalledWith({
        where: { leadId: "lead-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockNotes);
    });
  });

  describe("deleteNote", () => {
    it("should delete a note successfully", async () => {
      mockTenantPrisma.leadNote.delete.mockResolvedValue({ id: "note-1" });

      await deleteNote("note-1", "lead-1");

      expect(mockTenantPrisma.leadNote.delete).toHaveBeenCalledWith({
        where: { id: "note-1" },
      });
    });
  });
});
