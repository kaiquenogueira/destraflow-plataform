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
import { MoreVertical, Pencil, Trash2, Send, Loader2 } from "lucide-react";
import { TAG_LABELS, TAG_COLORS, type LeadTag } from "@/types";
import { deleteLead } from "@/actions/leads";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SendMessageModal } from "./send-message-modal";

interface Lead {
    id: string;
    name: string;
    phone: string;
    interest: string | null;
    tag: LeadTag;
    createdAt: Date;
}

interface LeadListProps {
    leads: Lead[];
}

export function LeadList({ leads }: LeadListProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState<string | null>(null);
    const [sendingTo, setSendingTo] = useState<Lead | null>(null);

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
                        {lead.interest && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {lead.interest}
                            </p>
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
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Interesse</TableHead>
                            <TableHead>Etiqueta</TableHead>
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
                                    <Badge className={TAG_COLORS[lead.tag]}>
                                        {TAG_LABELS[lead.tag]}
                                    </Badge>
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
        </>
    );
}
