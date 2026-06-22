import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTemplate, updateTemplate } from "./templates";
import { requireTenantContext } from "@/lib/tenant";

// Mock dependencies
vi.mock("@/lib/tenant", () => ({
  requireTenantContext: vi.fn(),
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
    (requireTenantContext as any).mockResolvedValue({
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

    // Invariante "sem DB → aborta" coberto 1x no resolver (tenant.test.ts), Sprint 05.
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
