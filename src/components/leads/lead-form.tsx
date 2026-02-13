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
import { TAG_LABELS, type LeadTag, type Lead } from "@/types";
import { createLead, updateLead } from "@/actions/leads";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const leadSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    phone: z
        .string()
        .regex(/^\+?[1-9]\d{10,14}$/, "Telefone inválido (ex: +5511999999999)"),
    interest: z.string().optional(),
    tag: z.enum(["COLD", "WARM", "HOT", "LOST", "CUSTOMER"]),
    aiPotential: z.string().optional(),
    aiScore: z.coerce.number().min(0).max(100).optional(),
    aiSummary: z.string().optional(),
    aiAction: z.string().optional(),
    aiMessageSuggestion: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
    lead?: Lead;
}

export function LeadForm({ lead }: LeadFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadSchema),
        defaultValues: {
            name: lead?.name || "",
            phone: lead?.phone || "",
            interest: lead?.interest || "",
            tag: lead?.tag || "COLD",
            aiPotential: lead?.aiPotential || "",
            aiScore: lead?.aiScore || undefined,
            aiSummary: lead?.aiSummary || "",
            aiAction: lead?.aiAction || "",
            aiMessageSuggestion: lead?.aiMessageSuggestion || "",
        },
    });

    const currentTag = watch("tag");

    const onSubmit = async (data: LeadFormData) => {
        setLoading(true);
        try {
            if (lead) {
                await updateLead({ ...data, id: lead.id });
                toast.success("Lead atualizado com sucesso!");
            } else {
                await createLead(data);
                toast.success("Lead criado com sucesso!");
            }
            router.push("/leads");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao salvar lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                    id="name"
                    {...register("name")}
                    placeholder="Nome do lead"
                    className="h-12"
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+5511999999999"
                    className="h-12"
                />
                {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    Formato: +55 + DDD + número (sem espaços)
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="interest">Interesse</Label>
                <Textarea
                    id="interest"
                    {...register("interest")}
                    placeholder="Descreva o interesse do lead..."
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tag">Etiqueta *</Label>
                <Select
                    value={currentTag}
                    onValueChange={(value) => setValue("tag", value as LeadTag)}
                >
                    <SelectTrigger className="h-12">
                        <SelectValue placeholder="Selecione uma etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(TAG_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Análise da Inteligência Artificial</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="aiPotential">Potencial</Label>
                        <Input
                            id="aiPotential"
                            {...register("aiPotential")}
                            placeholder="Ex: Alta, Média, Baixa"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aiScore">Score (0-100)</Label>
                        <Input
                            id="aiScore"
                            type="number"
                            {...register("aiScore")}
                            placeholder="Ex: 85"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="aiAction">Ação Sugerida</Label>
                    <Input
                        id="aiAction"
                        {...register("aiAction")}
                        placeholder="Ex: Ligar imediatamente"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="aiSummary">Resumo da Análise</Label>
                    <Textarea
                        id="aiSummary"
                        {...register("aiSummary")}
                        placeholder="Resumo gerado pela IA..."
                        rows={3}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="aiMessageSuggestion">Sugestão de Mensagem</Label>
                    <Textarea
                        id="aiMessageSuggestion"
                        {...register("aiMessageSuggestion")}
                        placeholder="Mensagem sugerida para envio..."
                        rows={3}
                    />
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
                    ) : lead ? (
                        "Atualizar"
                    ) : (
                        "Criar Lead"
                    )}
                </Button>
            </div>
        </form>
    );
}
