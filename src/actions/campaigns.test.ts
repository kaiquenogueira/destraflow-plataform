import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCampaign, getLeadsForCampaignSelection } from "./campaigns";
import { addMinutes } from "date-fns";

// Mock das dependências usando vi.hoisted para evitar erro de inicialização
const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
    getTenantContext: vi.fn().mockResolvedValue({
        tenantPrisma: {
            lead: {
                findMany: mocks.findMany,
            },
            campaign: {
                create: mocks.create,
            },
            campaignMessage: {
                createMany: mocks.createMany,
            },
            $transaction: vi.fn(),
        },
    }),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
}));

describe("Campaign Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set system time to a fixed date
        vi.useFakeTimers();
        const mockNow = new Date("2024-01-01T12:00:00Z");
        vi.setSystemTime(mockNow);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("createCampaign (Time Restriction)", () => {
        it("should reject campaign scheduled less than 10 minutes in the future", async () => {
            const now = new Date("2024-01-01T12:00:00Z");
            const invalidDate = addMinutes(now, 5); // 5 minutes from now

            const payload = {
                name: "Test Campaign",
                template: "Hello {{nome}} needs to be longer than 10 chars",
                scheduledAt: invalidDate,
                leadIds: ["lead-1"],
            };

            await expect(createCampaign(payload)).rejects.toThrow();
        });

        it("should accept campaign scheduled more than 10 minutes in the future", async () => {
            const now = new Date("2024-01-01T12:00:00Z");
            const validDate = addMinutes(now, 11); // 11 minutes from now

            const payload = {
                name: "Test Campaign",
                template: "Hello {{nome}} needs to be longer than 10 chars",
                scheduledAt: validDate,
                leadIds: ["lead-1"],
            };
            
            mocks.create.mockResolvedValue({ id: "campaign-1" });
            mocks.findMany.mockResolvedValue([{ id: "lead-1", name: "Test", phone: "123" }]);

            const result = await createCampaign(payload);
            expect(result.success).toBe(true);
        });
    });

    describe("getLeadsForCampaignSelection (Filtering)", () => {
        it("should query leads filtering out those in active campaigns", async () => {
            mocks.findMany.mockResolvedValue([]);

            await getLeadsForCampaignSelection();

            expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    messages: {
                        none: {
                            campaign: {
                                status: {
                                    in: ["SCHEDULED", "PROCESSING", "COMPLETED"]
                                }
                            }
                        }
                    }
                }
            }));
        });
    });
});
