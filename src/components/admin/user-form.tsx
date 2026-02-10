"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserFormProps {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        databaseUrl: string | null;
        evolutionInstance: string | null;
        evolutionApiKey: string | null;
        evolutionPhone: string | null;
    };
}

export function UserForm({ user }: UserFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<{
        email: string;
        password: string;
        name: string;
        role: "ADMIN" | "USER";
        databaseUrl: string;
        evolutionInstance: string;
        evolutionApiKey: string;
        evolutionPhone: string;
    }>({
        email: user?.email || "",
        password: "",
        name: user?.name || "",
        role: (user?.role as "ADMIN" | "USER") || "USER",
        databaseUrl: user?.databaseUrl || "",
        evolutionInstance: user?.evolutionInstance || "",
        evolutionApiKey: user?.evolutionApiKey || "",
        evolutionPhone: user?.evolutionPhone || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (user) {
                // Editar
                const dataToSend = {
                    id: user.id,
                    ...formData,
                    // Só envia password se foi preenchida
                    ...(formData.password ? {} : { password: undefined }),
                };
                await updateUser(dataToSend);
                toast.success("Usuário atualizado com sucesso");
            } else {
                // Criar
                if (!formData.password) {
                    toast.error("Senha é obrigatória para novos usuários");
                    setLoading(false);
                    return;
                }
                await createUser(formData as { 
                    email: string; 
                    password: string; 
                    name: string; 
                    role: "ADMIN" | "USER"; 
                    databaseUrl?: string; 
                    evolutionInstance?: string; 
                    evolutionApiKey?: string;
                    evolutionPhone?: string;
                });
                toast.success("Usuário criado com sucesso");
            }
            router.push("/admin/users");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao salvar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dados básicos */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="h-12"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {user ? "Nova Senha (deixe vazio para manter)" : "Senha *"}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!user}
                                className="h-12"
                                placeholder={user ? "••••••" : ""}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Permissão *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value as "ADMIN" | "USER" })}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Administrador</SelectItem>
                                    <SelectItem value="USER">Usuário</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Configuração do Database */}
                    <div className="space-y-2">
                        <Label htmlFor="databaseUrl">URL do Banco de Dados</Label>
                        <Textarea
                            id="databaseUrl"
                            value={formData.databaseUrl}
                            onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                            placeholder="postgresql://user:password@host:5432/database?schema=public"
                            className="font-mono text-sm"
                            rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                            URL de conexão PostgreSQL do banco de dados do cliente
                        </p>
                    </div>

                    {/* Configuração Evolution API */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="evolutionInstance">Instância Evolution API</Label>
                            <Input
                                id="evolutionInstance"
                                value={formData.evolutionInstance}
                                onChange={(e) => setFormData({ ...formData, evolutionInstance: e.target.value })}
                                placeholder="nome-da-instancia"
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evolutionApiKey">API Key Evolution (opcional)</Label>
                            <Input
                                id="evolutionApiKey"
                                type="password"
                                value={formData.evolutionApiKey}
                                onChange={(e) => setFormData({ ...formData, evolutionApiKey: e.target.value })}
                                placeholder="••••••"
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evolutionPhone">Número do Agente (Conectado)</Label>
                            <Input
                                id="evolutionPhone"
                                value={formData.evolutionPhone}
                                onChange={(e) => setFormData({ ...formData, evolutionPhone: e.target.value })}
                                placeholder="5511999999999"
                                className="h-12"
                            />
                            <p className="text-xs text-muted-foreground">
                                Número do WhatsApp conectado na instância (para identificação de sessão)
                            </p>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="flex-1 md:flex-none"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 md:flex-none">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {user ? "Salvar Alterações" : "Criar Usuário"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
