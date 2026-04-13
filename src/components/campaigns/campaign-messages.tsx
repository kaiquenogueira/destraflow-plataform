"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { retryCampaignDeadLetters, retryDeadLetterMessage } from "@/actions/campaigns";
import { Loader2, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
    id: string;
    status: string;
    scheduledAt: Date;
    sentAt: Date | null;
    error: string | null;
    retryCount: number;
    lead: {
        name: string;
        phone: string;
    };
}

interface CampaignMessagesProps {
    campaignId: string;
    messages: Message[];
    statusCounts: Record<string, number>;
}

const STATUS_BADGE = {
    SENT: { variant: "default" as const, label: "Enviado", className: "" },
    FAILED: { variant: "destructive" as const, label: "Falhou", className: "" },
    PROCESSING: { variant: "secondary" as const, label: "Enviando", className: "" },
    PENDING: { variant: "outline" as const, label: "Pendente", className: "" },
    DEAD_LETTER: {
        variant: "destructive" as const,
        label: "Falha Permanente",
        className: "bg-red-900 text-red-100 border-red-800 hover:bg-red-900",
    },
};

export function CampaignMessages({ campaignId, messages, statusCounts }: CampaignMessagesProps) {
    const router = useRouter();
    const [retryingAll, setRetryingAll] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const deadLetterCount = (statusCounts?.DEAD_LETTER || 0);
    const failedCount = (statusCounts?.FAILED || 0);
    const totalFailures = deadLetterCount + failedCount;

    const handleRetryAll = async () => {
        if (!confirm(`Retentar envio de ${deadLetterCount} mensagem(ns) com falha permanente?`)) return;

        setRetryingAll(true);
        try {
            const result = await retryCampaignDeadLetters(campaignId);
            toast.success(`${result.retriedCount} mensagem(ns) recolocadas na fila de envio`);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao retentar envios");
        } finally {
            setRetryingAll(false);
        }
    };

    const handleRetrySingle = async (messageId: string) => {
        setRetryingId(messageId);
        try {
            await retryDeadLetterMessage(messageId);
            toast.success("Mensagem recolocada na fila de envio");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao retentar envio");
        } finally {
            setRetryingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = STATUS_BADGE[status as keyof typeof STATUS_BADGE] || STATUS_BADGE.PENDING;
        return (
            <Badge variant={config.variant} className={config.className}>
                {config.label}
            </Badge>
        );
    };

    return (
        <>
            {/* Métricas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {messages.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {statusCounts?.SENT || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {(statusCounts?.PENDING || 0) + (statusCounts?.PROCESSING || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-red-600">
                                {totalFailures}
                            </div>
                            {deadLetterCount > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-8 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                    onClick={handleRetryAll}
                                    disabled={retryingAll}
                                >
                                    {retryingAll ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                    Retentar {deadLetterCount}
                                </Button>
                            )}
                        </div>
                        {deadLetterCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {deadLetterCount} com falha permanente
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Mensagens */}
            <Card>
                <CardHeader>
                    <CardTitle>Status dos Envios</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Agendado para</TableHead>
                                <TableHead>Enviado em</TableHead>
                                <TableHead>Erro</TableHead>
                                <TableHead className="w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messages.map((message) => (
                                <TableRow key={message.id}>
                                    <TableCell>{message.lead.name}</TableCell>
                                    <TableCell>{message.lead.phone}</TableCell>
                                    <TableCell>
                                        {getStatusBadge(message.status)}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(message.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>
                                        {message.sentAt
                                            ? format(new Date(message.sentAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                            : "-"}
                                    </TableCell>
                                    <TableCell
                                        className="text-red-500 text-sm max-w-[200px] truncate"
                                        title={message.error || ""}
                                    >
                                        {message.error || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {message.status === "DEAD_LETTER" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={() => handleRetrySingle(message.id)}
                                                disabled={retryingId === message.id}
                                                title="Retentar envio"
                                            >
                                                {retryingId === message.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
