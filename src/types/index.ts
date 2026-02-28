// Lead tags
export type LeadTag = "NEW" | "QUALIFICATION" | "PROSPECTING" | "CALL" | "MEETING" | "RETURN" | "LOST" | "CUSTOMER";

// Campaign status
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

// Message status
export type MessageStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "DEAD_LETTER";

export interface Lead {
    id: string;
    name: string;
    phone: string;
    interest: string | null;
    tag: LeadTag;
    createdAt: Date;
    updatedAt: Date;
    aiPotential?: string | null;
    aiScore?: number | null;
    aiSummary?: string | null;
    aiAction?: string | null;
    aiLastAnalyzedAt?: Date | null;
    aiMessageSuggestion?: string | null;
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
    aiPotential?: string;
    aiScore?: number;
    aiSummary?: string;
    aiAction?: string;
    aiLastAnalyzedAt?: Date;
    aiMessageSuggestion?: string;
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
    NEW: "Novo",
    QUALIFICATION: "Qualificação",
    PROSPECTING: "Prospecção",
    CALL: "Ligação",
    MEETING: "Reunião Agendada",
    RETURN: "Retorno",
    LOST: "Perdido",
    CUSTOMER: "Cliente",
};

export const TAG_COLORS: Record<LeadTag, string> = {
    NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    QUALIFICATION: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    PROSPECTING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    CALL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    MEETING: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    RETURN: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    LOST: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
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
    DEAD_LETTER: "Falha Permanente",
};
