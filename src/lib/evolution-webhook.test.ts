
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWebhookEvent } from './evolution-webhook';
import { prisma } from './prisma';
import * as prismaModule from './prisma'; // For mocking getTenantPrisma

// Mock dependencies
vi.mock('./prisma', () => ({
  prisma: {
    crmUser: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  getTenantPrisma: vi.fn(),
}));

vi.mock('./encryption', () => ({
  decrypt: vi.fn((val) => val.replace("encrypted_", "")),
  hashString: vi.fn((val) => "hashed_" + val),
}));

describe('Evolution Webhook', () => {
  const mockTenantPrisma = {
    whatsAppContact: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    lead: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return for getTenantPrisma
    (prismaModule.getTenantPrisma as any).mockReturnValue(mockTenantPrisma);
  });

  it('should ignore messages sent by me (fromMe: true)', async () => {
    const event = {
      event: 'MESSAGES_UPSERT',
      instance: 'test_instance',
      data: {
        key: {
          remoteJid: '123456789@s.whatsapp.net',
          fromMe: true,
          id: 'msg_id',
        },
      },
    };

    const result = await handleWebhookEvent(event);
    expect(result.result).toEqual({ action: 'ignored_self' });
  });

  it('should return tenant_not_found if instance is unknown', async () => {
    // Mock prisma.crmUser.findFirst to return null (not found)
    (prisma.crmUser.findFirst as any).mockResolvedValue(null);

    const event = {
      event: 'MESSAGES_UPSERT',
      instance: 'unknown_instance',
      data: {
        key: {
          remoteJid: '123456789@s.whatsapp.net',
          fromMe: false,
          id: 'msg_id',
        },
      },
    };

    const result = await handleWebhookEvent(event);
    expect(result.result).toEqual({ action: 'tenant_not_found' });
  });

  it('should save lead if tenant is found', async () => {
    // 1. Mock Tenant Found
    (prisma.crmUser.findFirst as any).mockResolvedValue({
      id: 'user_1',
      databaseUrl: 'encrypted_db_url',
    });

    // 2. Mock Tenant Prisma Actions
    mockTenantPrisma.whatsAppContact.findFirst.mockResolvedValue(null); // New contact
    mockTenantPrisma.whatsAppContact.create.mockResolvedValue({
      id: 1,
      name: 'Test User',
      whatsapp: '+123456789',
    });
    mockTenantPrisma.lead.findFirst.mockResolvedValue(null); // New Lead
    mockTenantPrisma.lead.create.mockResolvedValue({
      id: 'lead_1',
    });

    const event = {
      event: 'MESSAGES_UPSERT',
      instance: 'valid_instance',
      data: {
        key: {
          remoteJid: '123456789@s.whatsapp.net',
          fromMe: false,
          id: 'msg_id',
        },
        pushName: 'Test User',
        message: {
            conversation: 'Hello',
        }
      },
    };

    const result = await handleWebhookEvent(event);

    // Assertions
    expect(prisma.crmUser.findFirst).toHaveBeenCalledWith({
        where: { evolutionInstanceHash: 'hashed_valid_instance' },
        select: { id: true, databaseUrl: true }
    });
    expect(prismaModule.getTenantPrisma).toHaveBeenCalledWith('db_url');
    expect(mockTenantPrisma.whatsAppContact.create).toHaveBeenCalled();
    expect(mockTenantPrisma.lead.create).toHaveBeenCalled();
    expect(result.result).toEqual({ action: 'message_saved', phone: '+123456789' });
  });
});
