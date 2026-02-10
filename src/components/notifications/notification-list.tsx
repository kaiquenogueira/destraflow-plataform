"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, ExternalLink, Filter, X } from "lucide-react";
import { deleteNotification } from "@/actions/notifications";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExternalNotification {
    id: number;
    instance: string;
    numeroAgent: string;
    numeroCliente: string;
    notificationType: string;
    message: string;
    userData: string | null;
    criadoEm: Date | null;
}

interface NotificationListProps {
    notifications: ExternalNotification[];
    isAdminView?: boolean; // Se for admin, talvez não mostre botão de deletar ou mostre diferente
}

export function NotificationList({ notifications, isAdminView = false }: NotificationListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [selectedNotification, setSelectedNotification] = useState<ExternalNotification | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

    const handleFilter = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (startDate) params.set("startDate", startDate);
        else params.delete("startDate");
        
        if (endDate) params.set("endDate", endDate);
        else params.delete("endDate");
        
        params.set("page", "1"); // Reset to page 1
        
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        const params = new URLSearchParams(searchParams.toString());
        params.delete("startDate");
        params.delete("endDate");
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir esta notificação?")) return;
        
        setDeletingId(id);
        try {
            await deleteNotification(id);
            toast.success("Notificação excluída com sucesso");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao excluir notificação");
        } finally {
            setDeletingId(null);
        }
    };

    const getBadgeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'error': return 'destructive';
            case 'warning': return 'warning'; // Assumindo que existe variant warning ou usar default
            case 'info': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-lg bg-card items-end">
                <div className="grid gap-2">
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full md:w-[200px]"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full md:w-[200px]"
                    />
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleFilter} variant="secondary">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtrar
                    </Button>
                    {(startDate || endDate) && (
                        <Button onClick={clearFilters} variant="ghost" size="icon">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Agente</TableHead>
                            <TableHead>Mensagem</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {notifications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhuma notificação encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            notifications.map((notification) => (
                                <TableRow key={notification.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {notification.criadoEm
                                            ? format(new Date(notification.criadoEm), "dd/MM/yyyy HH:mm", {
                                                  locale: ptBR,
                                              })
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {notification.notificationType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {notification.numeroCliente ? (
                                            <a 
                                                href={`https://wa.me/${notification.numeroCliente.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-primary hover:underline group"
                                                title="Abrir no WhatsApp"
                                            >
                                                {notification.numeroCliente}
                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell>{notification.numeroAgent}</TableCell>
                                    <TableCell className="max-w-[300px] truncate">
                                        {notification.message}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedNotification(notification)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {!isAdminView && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/90"
                                                    onClick={() => handleDelete(notification.id)}
                                                    disabled={deletingId === notification.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Notificação</DialogTitle>
                        <DialogDescription>
                            ID: {selectedNotification?.id} | Instância: {selectedNotification?.instance}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedNotification && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium mb-1">Cliente</h4>
                                    <p className="text-sm text-muted-foreground">{selectedNotification.numeroCliente}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-1">Agente</h4>
                                    <p className="text-sm text-muted-foreground">{selectedNotification.numeroAgent}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-1">Mensagem</h4>
                                <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
                                    {selectedNotification.message}
                                </div>
                            </div>

                            {selectedNotification.userData && (
                                <div>
                                    <h4 className="text-sm font-medium mb-1">Dados do Usuário (JSON)</h4>
                                    <pre className="p-3 bg-slate-950 text-slate-50 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-[200px]">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(selectedNotification.userData), null, 2);
                                            } catch {
                                                return selectedNotification.userData;
                                            }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
