import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessageHistoryByLead } from "./message-history";

const mocks = vi.hoisted(() => ({
  getTenantContext: vi.fn(),
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
  createEvolutionClient: vi.fn(),
  decrypt: vi.fn((value: string) => value.replace("encrypted-", "")),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: mocks.getTenantContext,
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    crmUser: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/evolution", () => ({
  createEvolutionClient: mocks.createEvolutionClient,
}));

vi.mock("@/lib/encryption", () => ({
  decrypt: mocks.decrypt,
}));

describe("Message History Actions", () => {
  const tenantPrisma = {
    lead: {
      findUnique: vi.fn(),
    },
    whatsAppContact: {
      findFirst: vi.fn(),
    },
    chatHistory: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({ tenantPrisma });
  });

  it("should return messages from the local database without calling Evolution", async () => {
    tenantPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "Lead",
      phone: "+5511999999999",
    });
    tenantPrisma.whatsAppContact.findFirst.mockResolvedValue({ id: 10 });
    tenantPrisma.chatHistory.findMany.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date("2024-01-01T12:00:00Z"),
        message: { type: "system", content: "Mensagem enviada" },
      },
    ]);

    const result = await getMessageHistoryByLead("lead-1");

    expect(mocks.createEvolutionClient).not.toHaveBeenCalled();
    expect(result).toEqual({
      leadName: "Lead",
      leadPhone: "+5511999999999",
      messages: [
        {
          id: "1",
          direction: "outgoing",
          text: "Mensagem enviada",
          timestamp: new Date("2024-01-01T12:00:00Z"),
          source: "database",
        },
      ],
    });
  });

  it("should fallback to Evolution and normalize messages when the database is empty", async () => {
    const fetchMessages = vi.fn().mockResolvedValue([
      {
        key: { id: "msg-1", fromMe: false, remoteJid: "5511999999999@s.whatsapp.net" },
        message: { conversation: "Oi" },
        messageTimestamp: 1704067200,
        status: "DELIVERED",
      },
    ]);

    tenantPrisma.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "Lead",
      phone: "+5511999999999",
    });
    tenantPrisma.whatsAppContact.findFirst.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findUnique.mockResolvedValue({
      evolutionInstance: "encrypted-instance",
      evolutionApiKey: "encrypted-api-key",
    });
    mocks.createEvolutionClient.mockReturnValue({ fetchMessages });

    const result = await getMessageHistoryByLead("lead-1");

    expect(mocks.createEvolutionClient).toHaveBeenCalledWith("instance", "api-key");
    expect(result.messages).toEqual([
      {
        id: "msg-1",
        direction: "incoming",
        text: "Oi",
        timestamp: new Date(1704067200 * 1000),
        status: "DELIVERED",
        source: "evolution",
      },
    ]);
  });
});
