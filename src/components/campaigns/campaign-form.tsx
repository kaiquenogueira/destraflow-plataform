"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TAG_LABELS, TAG_COLORS, type LeadTag } from "@/types";
import { createCampaign, getLeadsForCampaignSelection } from "@/actions/campaigns";
import { getTemplates } from "@/actions/templates";
import { Loader2, Calendar, Check, ArrowRight, ArrowLeft, Users, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const campaignSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    template: z.string().min(10, "Template deve ter pelo menos 10 caracteres"),
    scheduledAt: z.string().min(1, "Data/hora é obrigatória"),
    leadIds: z.array(z.string()).min(1, "Selecione pelo menos um lead"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

// Tipo para os leads com histórico
interface LeadWithHistory {
    id: string;
    name: string;
    phone: string;
    tag: string;
    campaigns: { name: string; date: Date }[];
}

interface Template {
    id: string;
    name: string;
    content: string;
}

export function CampaignForm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Leads state
    const [leads, setLeads] = useState<LeadWithHistory[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Templates state
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        trigger,
        formState: { errors },
    } = useForm<CampaignFormData>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            leadIds: [],
        },
    });

    const selectedLeadIds = watch("leadIds");
    const templateContent = watch("template");

    // Fetch initial data
    useEffect(() => {
        const loadTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const data = await getTemplates();
                // Map Prisma template to local interface if needed, though they match
                setTemplates(data.map((t: any) => ({ id: t.id, name: t.name, content: t.content })));
            } catch (error) {
                console.error("Failed to load templates", error);
                toast.error("Erro ao carregar templates");
            } finally {
                setLoadingTemplates(false);
            }
        };

        loadTemplates();
    }, []);

    // Fetch leads on step 2
    useEffect(() => {
        if (step === 2 && leads.length === 0) {
            fetchLeads();
        }
    }, [step]);

    const fetchLeads = async () => {
        setLoadingLeads(true);
        try {
            const data = await getLeadsForCampaignSelection();
            setLeads(data);
        } catch (error) {
            toast.error("Erro ao carregar leads");
        } finally {
            setLoadingLeads(false);
        }
    };

    // Filter leads based on search term
    const filteredLeads = leads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        lead.phone.includes(searchTerm)
    );

    const onSubmit = async (data: CampaignFormData) => {
        setLoading(true);
        try {
            const result = await createCampaign({
                name: data.name,
                template: data.template,
                scheduledAt: new Date(data.scheduledAt),
                leadIds: data.leadIds,
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

    const nextStep = async () => {
        let valid = false;
        if (step === 1) {
            valid = await trigger(["name", "template"]);
        } else if (step === 2) {
            valid = await trigger("leadIds");
            if (!valid && (!selectedLeadIds || selectedLeadIds.length === 0)) {
                // Ensure manual check if trigger doesn't catch it immediately or for UX
                toast.error("Selecione pelo menos um lead");
                return;
            }
        }
        
        if (valid) setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    const toggleLead = (id: string) => {
        const current = selectedLeadIds || [];
        const updated = current.includes(id)
            ? current.filter((i) => i !== id)
            : [...current, id];
        setValue("leadIds", updated, { shouldValidate: true });
    };

    const toggleAllLeads = () => {
        if (selectedLeadIds?.length === leads.length) {
            setValue("leadIds", []);
        } else {
            setValue("leadIds", leads.map((l) => l.id));
        }
    };

    // Data mínima: agora
    const minDate = new Date().toISOString().slice(0, 16);

    return (
        <div className="space-y-6">
            {/* Stepper */}
            <div className="flex items-center justify-between px-4 mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center z-10">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                                step >= s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {step > s ? <Check className="w-4 h-4" /> : s}
                        </div>
                        <span className="text-xs mt-2 text-muted-foreground font-medium">
                            {s === 1 && "Configuração"}
                            {s === 2 && "Leads"}
                            {s === 3 && "Agendamento"}
                        </span>
                    </div>
                ))}
                {/* Visual Line */}
                <div className="absolute left-0 right-0 top-6 h-[2px] bg-muted -z-0 mx-auto w-[80%] max-w-md hidden md:block" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* STEP 1: Configuração */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Campanha *</Label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="Ex: Promoção de Natal"
                                className="h-12"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="templateSelect">Selecionar Template</Label>
                            <Select
                                onValueChange={(value) => {
                                    const selected = templates.find(t => t.id === value);
                                    if (selected) {
                                        setValue("template", selected.content, { shouldValidate: true });
                                    }
                                }}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Selecione um modelo de mensagem" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template">Conteúdo da Mensagem *</Label>
                            <Textarea
                                id="template"
                                {...register("template")}
                                placeholder="Selecione um template acima ou digite..."
                                rows={6}
                                className="resize-none"
                            />
                            {errors.template && (
                                <p className="text-sm text-destructive">{errors.template.message}</p>
                            )}
                            <div className="flex justify-between items-start text-xs text-muted-foreground">
                                <p>Use apenas <strong>{"{{nome}}"}</strong> como variável.</p>
                                {templateContent && !templateContent.includes("{{nome}}") && (
                                    <span className="text-yellow-600 flex items-center">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Recomendado incluir {"{{nome}}"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Seleção de Leads */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end mb-4">
                            <div className="flex-1 w-full space-y-2">
                                <Label>Buscar Leads</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar por nome ou telefone..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-10"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center pb-2">
                                <Badge variant="secondary">
                                    {selectedLeadIds?.length || 0} selecionados
                                </Badge>
                            </div>
                        </div>

                        {loadingLeads ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg bg-muted/20">
                                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p>Nenhum lead encontrado{searchTerm && " com este filtro"}.</p>
                            </div>
                        ) : (
                            <div className="border rounded-md max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <input
                                                    type="checkbox"
                                                    className="translate-y-[2px] w-4 h-4 accent-primary"
                                                    checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds?.includes(l.id))}
                                                    onChange={() => {
                                                        const allFilteredIds = filteredLeads.map(l => l.id);
                                                        const allSelected = allFilteredIds.every(id => selectedLeadIds?.includes(id));
                                                        
                                                        let newSelected = [...(selectedLeadIds || [])];
                                                        
                                                        if (allSelected) {
                                                            // Unselect all filtered
                                                            newSelected = newSelected.filter(id => !allFilteredIds.includes(id));
                                                        } else {
                                                            // Select all filtered
                                                            const toAdd = allFilteredIds.filter(id => !newSelected.includes(id));
                                                            newSelected = [...newSelected, ...toAdd];
                                                        }
                                                        setValue("leadIds", newSelected, { shouldValidate: true });
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead>Nome / Telefone</TableHead>
                                            <TableHead>Tag</TableHead>
                                            <TableHead className="text-right">Campanhas Anteriores</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredLeads.map((lead) => {
                                            const hasHistory = lead.campaigns.length > 0;
                                            return (
                                                <TableRow key={lead.id} className={hasHistory ? "bg-muted/30" : ""}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            className="translate-y-[2px] w-4 h-4 accent-primary"
                                                            checked={selectedLeadIds?.includes(lead.id)}
                                                            onChange={() => toggleLead(lead.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{lead.name}</div>
                                                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={TAG_COLORS[lead.tag as LeadTag] || "bg-gray-100"}>
                                                            {TAG_LABELS[lead.tag as LeadTag] || lead.tag}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {hasHistory ? (
                                                            <div className="flex items-center justify-end text-yellow-600 gap-1 text-xs font-medium">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                {lead.campaigns.length} participações
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {errors.leadIds && (
                            <p className="text-sm text-destructive">{errors.leadIds.message}</p>
                        )}
                    </div>
                )}

                {/* STEP 3: Agendamento */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-2">
                            <Label htmlFor="scheduledAt">Data e Hora do Disparo *</Label>
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
                                O sistema iniciará o envio das mensagens automaticamente neste horário.
                            </p>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg space-y-3 border">
                            <h4 className="font-medium flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600" />
                                Resumo da Campanha
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Nome:</span>
                                    <p className="font-medium">{watch("name")}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Destinatários:</span>
                                    <p className="font-medium">{selectedLeadIds?.length} leads selecionados</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Mensagem:</span>
                                    <p className="font-medium italic text-muted-foreground truncate">"{watch("template")}"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-6 border-t mt-8">
                    {step === 1 ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-12"
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-12"
                            onClick={prevStep}
                            disabled={loading}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    )}

                    {step < 3 ? (
                        <Button
                            type="button"
                            className="flex-1 h-12"
                            onClick={nextStep}
                        >
                            Próximo
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" className="flex-1 h-12" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Agendando...
                                </>
                            ) : (
                                "Confirmar e Agendar"
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
