"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Send, Loader2, Calendar, Bot, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TAG_LABELS, TAG_COLORS, type LeadTag, type Lead } from "@/types";
import { deleteLead } from "@/actions/leads";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { SendMessageModal } from "./send-message-modal";
import { LeadDetailsModal } from "./lead-details-modal";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadListProps {
    leads: Lead[];
}

export function LeadList({ leads }: LeadListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [deleting, setDeleting] = useState<string | null>(null);
    const [sendingTo, setSendingTo] = useState<Lead | null>(null);
    const [viewingDetails, setViewingDetails] = useState<Lead | null>(null);

    const orderBy = searchParams.get("orderBy");
    const orderDirection = searchParams.get("orderDirection");

    const handleSort = (field: string) => {
        const params = new URLSearchParams(searchParams.toString());
        
        if (orderBy === field) {
            // Toggle direction
            if (orderDirection === "asc") {
                params.set("orderDirection", "desc");
            } else {
                params.set("orderDirection", "asc");
            }
        } else {
            // New field, default to desc for dates/scores, asc for text
            params.set("orderBy", field);
            params.set("orderDirection", field === "name" ? "asc" : "desc");
        }

        router.push(`/leads?${params.toString()}`);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (orderBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        return orderDirection === "asc" 
            ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
            : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este lead?")) return;

        setDeleting(id);
        try {
            await deleteLead(id);
            toast.success("Lead excluído com sucesso");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao excluir");
        } finally {
            setDeleting(null);
        }
    };

    if (leads.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Nenhum lead encontrado</p>
                <Link href="/leads/new">
                    <Button>Criar primeiro lead</Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {leads.map((lead) => (
                    <div
                        key={lead.id}
                        className="bg-white dark:bg-slate-900 rounded-lg border p-4 space-y-3"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold">{lead.name}</h3>
                                <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            </div>
                            <Badge className={TAG_COLORS[lead.tag]}>{TAG_LABELS[lead.tag]}</Badge>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                                {format(lead.updatedAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                        {lead.interest && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {lead.interest}
                            </p>
                        )}
                        {lead.aiPotential && (
                            <div 
                                className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded px-1 -mx-1"
                                onClick={() => setViewingDetails(lead)}
                            >
                                <span className={`text-xs font-semibold ${lead.aiPotential.toLowerCase().includes('alta') || lead.aiPotential.toLowerCase().includes('alto') ? 'text-green-600' : 'text-purple-600 dark:text-purple-400'}`}>
                                    AI: {lead.aiPotential}
                                </span>
                                {lead.aiScore && <span className="text-xs text-muted-foreground">({lead.aiScore} pts)</span>}
                                {lead.aiAction && (
                                     <span className="text-xs text-muted-foreground truncate flex-1 text-right" title={lead.aiAction}>
                                        {lead.aiAction}
                                     </span>
                                )}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setSendingTo(lead)}
                            >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar
                            </Button>
                            <Link href={`/leads/${lead.id}`} className="flex-1">
                                <Button size="sm" variant="outline" className="w-full">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                            </Link>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(lead.id)}
                                disabled={deleting === lead.id}
                            >
                                {deleting === lead.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border bg-white dark:bg-slate-900">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleSort("name")}
                            >
                                <div className="flex items-center">
                                    Nome
                                    <SortIcon field="name" />
                                </div>
                            </TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Interesse</TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleSort("aiScore")}
                            >
                                <div className="flex items-center">
                                    Potencial AI
                                    <SortIcon field="aiScore" />
                                </div>
                            </TableHead>
                            <TableHead>Sugestão</TableHead>
                            <TableHead>Etiqueta</TableHead>
                            <TableHead 
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => handleSort("updatedAt")}
                            >
                                <div className="flex items-center">
                                    Atualizado
                                    <SortIcon field="updatedAt" />
                                </div>
                            </TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.map((lead) => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium">{lead.name}</TableCell>
                                <TableCell>{lead.phone}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                    {lead.interest || "-"}
                                </TableCell>
                                <TableCell>
                                    {lead.aiPotential ? (
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${lead.aiPotential.toLowerCase().includes('alta') || lead.aiPotential.toLowerCase().includes('alto') ? 'text-green-600' : ''}`}>
                                                {lead.aiPotential}
                                            </span>
                                            {lead.aiScore && <span className="text-xs text-muted-foreground">{lead.aiScore} pts</span>}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={lead.aiAction || ""}>
                                    {lead.aiAction || "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge className={TAG_COLORS[lead.tag]}>
                                        {TAG_LABELS[lead.tag]}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {format(lead.updatedAt, "dd/MM HH:mm")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(lead.updatedAt, { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setSendingTo(lead)}>
                                                <Send className="mr-2 h-4 w-4" />
                                                Enviar Mensagem
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setViewingDetails(lead)}>
                                                <Bot className="mr-2 h-4 w-4" />
                                                Ver Análise AI
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/leads/${lead.id}`}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => handleDelete(lead.id)}
                                                disabled={deleting === lead.id}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Send Message Modal */}
            <SendMessageModal
                lead={sendingTo}
                open={!!sendingTo}
                onClose={() => setSendingTo(null)}
            />

            <LeadDetailsModal
                lead={viewingDetails}
                open={!!viewingDetails}
                onClose={() => setViewingDetails(null)}
            />
        </>
    );
}
