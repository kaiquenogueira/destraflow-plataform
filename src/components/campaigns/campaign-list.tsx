"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS, TAG_LABELS, type CampaignStatus, type LeadTag } from "@/types";
import { cancelCampaign } from "@/actions/campaigns";
import { Calendar, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
    id: string;
    name: string;
    template: string;
    targetTag: LeadTag | null;
    scheduledAt: Date;
    status: CampaignStatus;
    _count: { messages: number };
}

interface CampaignListProps {
    campaigns: Campaign[];
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

export function CampaignList({ campaigns }: CampaignListProps) {
    const router = useRouter();
    const [cancelling, setCancelling] = useState<string | null>(null);

    const handleCancel = async (id: string) => {
        if (!confirm("Tem certeza que deseja cancelar esta campanha?")) return;

        setCancelling(id);
        try {
            await cancelCampaign(id);
            toast.success("Campanha cancelada");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao cancelar");
        } finally {
            setCancelling(null);
        }
    };

    if (campaigns.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Nenhuma campanha encontrada</p>
                <Link href="/campaigns/new">
                    <Button>Criar primeira campanha</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
                <Card key={campaign.id} className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-1">
                                {campaign.name}
                            </CardTitle>
                            <Badge className={STATUS_COLORS[campaign.status]}>
                                {STATUS_LABELS[campaign.status]}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {campaign.template}
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(campaign.scheduledAt), "dd/MM/yyyy HH:mm", {
                                    locale: ptBR,
                                })}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                {campaign._count.messages} msg
                            </div>
                        </div>

                        {campaign.targetTag && (
                            <Badge variant="outline">{TAG_LABELS[campaign.targetTag]}</Badge>
                        )}

                        <div className="flex items-center gap-2">
                            <Link href={`/campaigns/${campaign.id}`} className="w-full">
                                <Button variant="outline" size="sm" className="w-full">
                                    Ver Detalhes
                                </Button>
                            </Link>

                            {campaign.status === "SCHEDULED" && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleCancel(campaign.id)}
                                    disabled={cancelling === campaign.id}
                                >
                                    {cancelling === campaign.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <X className="mr-2 h-4 w-4" />
                                    )}
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
