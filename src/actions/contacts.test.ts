import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncContactToLead } from "./contacts";

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

import { getTenantContext } from "@/lib/tenant";

describe("syncContactToLead", () => {
  const tenantPrisma = {
    whatsAppContact: {
      findUnique: vi.fn(),
    },
    lead: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getTenantContext as any).mockResolvedValue({ tenantPrisma });
  });

  it("creates a Lead persisting phoneNormalized canônico quando não há lead casando (raw contact)", async () => {
    tenantPrisma.whatsAppContact.findUnique.mockResolvedValue({
      id: 1,
      whatsapp: "11988887777", // cru, sem +55
      name: "Z",
    });
    // findLeadByPhone: nem fast-path nem fallback casam → cria lead.
    tenantPrisma.lead.findFirst.mockResolvedValue(null);
    tenantPrisma.lead.findMany.mockResolvedValue([]);
    tenantPrisma.lead.create.mockResolvedValue({ id: "lead-1" });

    const result = await syncContactToLead(1);

    expect(tenantPrisma.lead.create).toHaveBeenCalledWith({
      data: {
        name: "Z",
        phone: "11988887777",
        phoneNormalized: "+5511988887777",
        tag: "NEW",
      },
    });
    expect(result.success).toBe(true);
  });

  it("reuses an existing Lead matched by phone identity (no create)", async () => {
    tenantPrisma.whatsAppContact.findUnique.mockResolvedValue({
      id: 2,
      whatsapp: "5511988887777", // formato diferente do lead existente
      name: "Y",
    });
    // findLeadByPhone fast-path acha o lead canônico → não cria.
    tenantPrisma.lead.findFirst.mockResolvedValue({ id: "lead-existing", phone: "+5511988887777" });

    const result = await syncContactToLead(2);

    expect(tenantPrisma.lead.create).not.toHaveBeenCalled();
    expect(result.lead).toMatchObject({ id: "lead-existing" });
  });
});
