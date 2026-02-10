"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteTemplate } from "@/actions/templates";
import { FileText, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Template {
    id: string;
    name: string;
    content: string;
    createdAt: Date;
}

interface TemplateListProps {
    templates: Template[];
}

export function TemplateList({ templates }: TemplateListProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este template?")) return;

        setDeleting(id);
        try {
            await deleteTemplate(id);
            toast.success("Template excluído");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao excluir template");
        } finally {
            setDeleting(null);
        }
    };

    if (templates.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum template cadastrado.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
                <Card key={template.id} className="relative overflow-hidden group">
                    <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg line-clamp-1">
                                {template.name}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(template.id)}
                                disabled={deleting === template.id}
                            >
                                {deleting === template.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground line-clamp-4 min-h-[5rem] whitespace-pre-wrap">
                            {template.content}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Criado em {format(new Date(template.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                        
                        {!template.content.includes("{{nome}}") && (
                            <div className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Sem variável {"{{nome}}"}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
