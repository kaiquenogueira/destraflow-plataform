"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendUnitMessage, generateAIPersonalizedMessage } from "@/actions/campaigns";
import { Loader2, Send, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

interface SendMessageModalProps {
    lead: { id: string; name: string; phone: string } | null;
    open: boolean;
    onClose: () => void;
}

const TEMPLATES = [
    {
        name: "Saudação",
        content: "Olá {{nome}}, tudo bem? 😊",
    },
    {
        name: "Follow-up",
        content: "Oi {{nome}}, passando para saber se você tem alguma dúvida sobre nossos serviços!",
    },
    {
        name: "Promoção",
        content: "{{nome}}, temos uma oferta especial para você! Quer saber mais? 🎉",
    },
];

export function SendMessageModal({ lead, open, onClose }: SendMessageModalProps) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    const handleSend = async () => {
        if (!lead || !message.trim()) return;

        setLoading(true);
        try {
            await sendUnitMessage(lead.id, message);
            toast.success("Mensagem adicionada à fila de envio!");
            router.refresh();
            onClose();
            setMessage("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAI = async () => {
        if (!lead || !message.trim()) return;

        setGeneratingAI(true);
        try {
            const result = await generateAIPersonalizedMessage(lead.id, message);
            setMessage(result.personalizedMessage);
            toast.success("Mensagem reescrita com IA! Você pode editar antes de enviar.");
            router.refresh(); // Para atualizar o contador de créditos no cabeçalho
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao gerar mensagem com IA");
        } finally {
            setGeneratingAI(false);
        }
    };

    const selectTemplate = (template: string) => {
        setMessage(template);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enviar Mensagem</DialogTitle>
                    <DialogDescription>
                        Enviar mensagem para <strong>{lead?.name}</strong> ({lead?.phone})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                            Templates rápidos
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {TEMPLATES.map((t) => (
                                <Button
                                    key={t.name}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectTemplate(t.content)}
                                >
                                    {t.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="message">Mensagem</Label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleGenerateAI}
                                disabled={!message.trim() || generatingAI || loading}
                                className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-950/50"
                            >
                                {generatingAI ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Gerar Sugestão de IA
                            </Button>
                        </div>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem base... Use {{nome}} para inserir o nome do lead"
                            rows={5}
                        />
                        <p className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>Variáveis disponíveis: {"{{nome}}"}, {"{{telefone}}"}, {"{{interesse}}"}</span>
                            <span className="flex items-center gap-1 text-blue-600/70 dark:text-blue-400/70">
                                <Bot className="w-3 h-3" />
                                1 Crédito/Geração
                            </span>
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={onClose} disabled={loading || generatingAI}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSend}
                            disabled={!message.trim() || loading || generatingAI}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
