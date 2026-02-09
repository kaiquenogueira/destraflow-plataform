"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TAG_LABELS, type LeadTag } from "@/types";
import { createCampaign } from "@/actions/campaigns";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const campaignSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    template: z.string().min(10, "Template deve ter pelo menos 10 caracteres"),
    targetTag: z.enum(["COLD", "WARM", "HOT", "LOST", "CUSTOMER", "ALL"]).optional(),
    scheduledAt: z.string().min(1, "Data/hora é obrigatória"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export function CampaignForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CampaignFormData>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            targetTag: "ALL",
        },
    });

    const currentTag = watch("targetTag");

    const onSubmit = async (data: CampaignFormData) => {
        setLoading(true);
        try {
            const result = await createCampaign({
                name: data.name,
                template: data.template,
                targetTag: data.targetTag === "ALL" ? undefined : (data.targetTag as LeadTag),
                scheduledAt: new Date(data.scheduledAt),
            });

            toast.success(
                `Campanha criada! ${result.leadsCount} mensagens agendadas.`
            );
            router.push("/campaigns");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao criar campanha");
        } finally {
            setLoading(false);
        }
    };

    // Data mínima: agora
    const minDate = new Date().toISOString().slice(0, 16);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                    id="name"
                    {...register("name")}
                    placeholder="Ex: Black Friday 2024"
                    className="h-12"
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="targetTag">Segmentação</Label>
                <Select
                    value={currentTag}
                    onValueChange={(value) => setValue("targetTag", value as LeadTag | "ALL")}
                >
                    <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione a segmentação" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os leads</SelectItem>
                        {Object.entries(TAG_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                Apenas: {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Escolha quais leads receberão esta campanha
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="template">Mensagem *</Label>
                <Textarea
                    id="template"
                    {...register("template")}
                    placeholder="Olá {{nome}}, temos uma novidade especial para você!"
                    rows={5}
                />
                {errors.template && (
                    <p className="text-sm text-destructive">{errors.template.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    Variáveis: {"{{nome}}"}, {"{{telefone}}"}, {"{{interesse}}"}
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="scheduledAt">Data/Hora do Disparo *</Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="scheduledAt"
                        type="datetime-local"
                        {...register("scheduledAt")}
                        min={minDate}
                        className="h-12 pl-10"
                    />
                </div>
                {errors.scheduledAt && (
                    <p className="text-sm text-destructive">{errors.scheduledAt.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    As mensagens serão processadas pelo N8N neste horário
                </p>
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
                            Criando...
                        </>
                    ) : (
                        "Agendar Campanha"
                    )}
                </Button>
            </div>
        </form>
    );
}
