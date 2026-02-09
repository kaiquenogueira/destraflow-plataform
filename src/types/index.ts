// Lead tags
export type LeadTag = "COLD" | "WARM" | "HOT" | "LOST" | "CUSTOMER";

// Campaign status
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

// Message status
export type MessageStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED";

export interface Lead {
    id: string;
    name: string;
    phone: string;
    interest: string | null;
    tag: LeadTag;
    createdAt: Date;
    updatedAt: Date;
}

export interface Campaign {
    id: string;
    name: string;
    template: string;
    targetTag: LeadTag | null;
    scheduledAt: Date;
    status: CampaignStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface CampaignMessage {
    id: string;
    payload: string;
    scheduledAt: Date;
    sentAt: Date | null;
    status: MessageStatus;
    error: string | null;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    campaignId: string | null;
    leadId: string;
}

// Form inputs
export interface CreateLeadInput {
    name: string;
    phone: string;
    interest?: string;
    tag: LeadTag;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
    id: string;
}

export interface CreateCampaignInput {
    name: string;
    template: string;
    targetTag?: LeadTag;
    scheduledAt: Date;
}

export interface SendUnitMessageInput {
    leadId: string;
    template: string;
}

// Dashboard metrics
export interface DashboardMetrics {
    totalLeads: number;
    leadsByTag: Record<LeadTag, number>;
    evolutionStatus: {
        connected: boolean;
        state: string;
    };
    pendingMessages: number;
    sentMessages: number;
}

// Tag labels em português
export const TAG_LABELS: Record<LeadTag, string> = {
    COLD: "Frio",
    WARM: "Morno",
    HOT: "Quente",
    LOST: "Perdido",
    CUSTOMER: "Cliente",
};

export const TAG_COLORS: Record<LeadTag, string> = {
    COLD: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    WARM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    HOT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    LOST: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    CUSTOMER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
    DRAFT: "Rascunho",
    SCHEDULED: "Agendada",
    PROCESSING: "Em Processamento",
    COMPLETED: "Finalizada",
    CANCELLED: "Cancelada",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
    PENDING: "Pendente",
    PROCESSING: "Enviando",
    SENT: "Enviada",
    FAILED: "Falha",
};
