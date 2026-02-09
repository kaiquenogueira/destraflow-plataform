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
import { sendUnitMessage } from "@/actions/campaigns";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
                        <Label htmlFor="message">Mensagem</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem... Use {{nome}} para inserir o nome do lead"
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            Variáveis disponíveis: {"{{nome}}"}, {"{{telefone}}"}, {"{{interesse}}"}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSend}
                            disabled={!message.trim() || loading}
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
