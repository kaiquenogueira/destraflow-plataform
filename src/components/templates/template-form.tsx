"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTemplate } from "@/actions/templates";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const templateSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    content: z.string().min(10, "Conteúdo deve ter pelo menos 10 caracteres"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export function TemplateForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<TemplateFormData>({
        resolver: zodResolver(templateSchema),
    });

    const content = watch("content");

    const onSubmit = async (data: TemplateFormData) => {
        setLoading(true);
        try {
            await createTemplate(data);
            toast.success("Template criado com sucesso!");
            router.push("/templates");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao criar template");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                    id="name"
                    {...register("name")}
                    placeholder="Ex: Oferta de Natal"
                    className="h-12"
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="content">Conteúdo da Mensagem *</Label>
                <Textarea
                    id="content"
                    {...register("content")}
                    placeholder="Olá {{nome}}, confira nossas ofertas..."
                    rows={8}
                    className="resize-none"
                />
                {errors.content && (
                    <p className="text-sm text-destructive">{errors.content.message}</p>
                )}
                
                <div className="flex justify-between items-start text-xs text-muted-foreground pt-1">
                    <p>Variável disponível: <strong>{"{{nome}}"}</strong></p>
                    {content && !content.includes("{{nome}}") && (
                        <span className="text-yellow-600 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Recomendado incluir {"{{nome}}"}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => router.back()}
                >
                    Cancelar
                </Button>
                <Button type="submit" className="flex-1 h-12" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        "Criar Template"
                    )}
                </Button>
            </div>
        </form>
    );
}
