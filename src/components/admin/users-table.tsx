"use client";

import { useState } from "react";
import { deleteUser, resetUserPassword } from "@/actions/admin";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Pencil, Trash, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    databaseUrl: string | null;
    evolutionInstance: string | null;
    createdAt: Date;
}

interface UsersTableProps {
    users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
    const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; userName: string }>({
        open: false,
        userId: "",
        userName: "",
    });
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) return;

        try {
            await deleteUser(id);
            toast.success("Usuário excluído com sucesso");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao excluir");
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            toast.error("Senha deve ter pelo menos 6 caracteres");
            return;
        }

        setLoading(true);
        try {
            await resetUserPassword(resetDialog.userId, newPassword);
            toast.success("Senha alterada com sucesso");
            setResetDialog({ open: false, userId: "", userName: "" });
            setNewPassword("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao alterar senha");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className="p-4 border rounded-lg bg-card space-y-2"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                {user.role}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {user.databaseUrl ? "✓ DB configurado" : "✗ Sem DB"}
                            {" • "}
                            {user.evolutionInstance ? "✓ WhatsApp" : "✗ Sem WhatsApp"}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Link href={`/admin/users/${user.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetDialog({ open: true, userId: user.id, userName: user.name })}
                            >
                                <Key className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Database</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.databaseUrl ? (
                                        <Badge variant="outline" className="text-green-600">Configurado</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500">Não</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {user.evolutionInstance || "-"}
                                </TableCell>
                                <TableCell>
                                    {format(new Date(user.createdAt), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/users/${user.id}`}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setResetDialog({ open: true, userId: user.id, userName: user.name })}
                                            >
                                                <Key className="h-4 w-4 mr-2" />
                                                Resetar Senha
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => handleDelete(user.id, user.name)}
                                            >
                                                <Trash className="h-4 w-4 mr-2" />
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

            {/* Reset Password Dialog */}
            <Dialog open={resetDialog.open} onOpenChange={(open) => setResetDialog({ ...resetDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resetar Senha</DialogTitle>
                        <DialogDescription>
                            Digite a nova senha para {resetDialog.userName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nova Senha</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialog({ open: false, userId: "", userName: "" })}>
                            Cancelar
                        </Button>
                        <Button onClick={handleResetPassword} disabled={loading}>
                            {loading ? "Salvando..." : "Alterar Senha"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
