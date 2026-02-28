"use client";

import { useEffect, useState, useTransition } from "react";
import { getMessageHistoryByLead } from "@/actions/message-history";
import type { NormalizedMessage } from "@/actions/message-history";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, ArrowDownCircle, Clock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageHistoryProps {
    leadId: string;
}

export function MessageHistory({ leadId }: MessageHistoryProps) {
    const [messages, setMessages] = useState<NormalizedMessage[]>([]);
    const [leadInfo, setLeadInfo] = useState<{ name: string; phone: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            try {
                const result = await getMessageHistoryByLead(leadId);
                setMessages(result.messages);
                setLeadInfo({ name: result.leadName, phone: result.leadPhone });
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro ao carregar histórico");
            }
        });
    }, [leadId]);

    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Carregando histórico...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-3 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-xs mt-1">O histórico de conversas aparecerá aqui.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                    {messages.length} mensage{messages.length === 1 ? "m" : "ns"}
                </span>
                {leadInfo && (
                    <span className="text-xs text-muted-foreground ml-auto">
                        {leadInfo.phone}
                    </span>
                )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-3 pb-2">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </div>
            </ScrollArea>

            {/* Source indicator */}
            {messages.length > 0 && (
                <div className="flex items-center justify-center gap-1 pt-3 mt-3 border-t">
                    <ArrowDownCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Fonte: {messages[0].source === "database" ? "Banco de Dados" : "Evolution API"}
                    </span>
                </div>
            )}
        </div>
    );
}

function MessageBubble({ message }: { message: NormalizedMessage }) {
    const isOutgoing = message.direction === "outgoing";

    return (
        <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
            <div
                className={`
                    max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                    ${isOutgoing
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }
                `}
            >
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                <div
                    className={`flex items-center gap-1 mt-1.5 ${isOutgoing ? "justify-end" : "justify-start"
                        }`}
                >
                    <Clock className="h-2.5 w-2.5 opacity-60" />
                    <span className="text-[10px] opacity-60">
                        {format(new Date(message.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                </div>
            </div>
        </div>
    );
}
