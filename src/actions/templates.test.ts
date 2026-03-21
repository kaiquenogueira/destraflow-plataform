import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTemplate, updateTemplate } from "./templates";
import { getTenantContext } from "@/lib/tenant";

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Templates Actions", () => {
  const mockTenantPrisma = {
    template: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (getTenantContext as any).mockResolvedValue({
      tenantPrisma: mockTenantPrisma,
    });
  });

  describe("createTemplate", () => {
    it("should sanitize XSS from template content before saving", async () => {
      mockTenantPrisma.template.create.mockResolvedValue({
        id: "tpl-1",
        name: "Test Template",
        content: "&lt;script&gt;alert('xss')&lt;/script&gt;Hello {{nome}}",
      });

      const input = {
        name: "Test Template",
        content: "<script>alert('xss')</script>Hello {{nome}}",
      };

      await createTemplate(input);

      expect(mockTenantPrisma.template.create).toHaveBeenCalledWith({
        data: {
          name: "Test Template",
          content: "&lt;script&gt;alert('xss')&lt;/script&gt;Hello {{nome}}",
        },
      });
    });

    it("should throw error if database is not configured", async () => {
      (getTenantContext as any).mockResolvedValue(null);

      await expect(
        createTemplate({
          name: "Test",
          content: "Valid content here",
        })
      ).rejects.toThrow("Banco de dados não configurado");
    });
  });

  describe("updateTemplate", () => {
    it("should sanitize XSS from template content on update", async () => {
      mockTenantPrisma.template.update.mockResolvedValue({
        id: "tpl-1",
        name: "Test Template",
        content: "New content <img src>",
      });

      const input = {
        id: "tpl-1",
        content: "New content <img src=x onerror=alert(1)>",
      };

      await updateTemplate(input);

      expect(mockTenantPrisma.template.update).toHaveBeenCalledWith({
        where: { id: "tpl-1" },
        data: {
          content: "New content <img src>",
        },
      });
    });
  });
});
