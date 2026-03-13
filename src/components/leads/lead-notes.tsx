"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, StickyNote, Plus } from "lucide-react";
import { createNote, getNotesByLeadId, deleteNote } from "@/actions/notes";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadNote {
    id: string;
    content: string;
    createdAt: string | Date;
    leadId: string;
}

interface LeadNotesProps {
    leadId: string;
}

export function LeadNotes({ leadId }: LeadNotesProps) {
    const [notes, setNotes] = useState<LeadNote[]>([]);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [fetching, setFetching] = useState(true);

    const fetchNotes = useCallback(async () => {
        try {
            const data = await getNotesByLeadId(leadId);
            setNotes(data);
        } catch {
            toast.error("Erro ao carregar notas");
        } finally {
            setFetching(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleCreate = async () => {
        if (!content.trim()) return;

        setLoading(true);
        try {
            await createNote({ leadId, content: content.trim() });
            setContent("");
            toast.success("Nota adicionada");
            await fetchNotes();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao criar nota");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        setDeleting(noteId);
        try {
            await deleteNote(noteId, leadId);
            toast.success("Nota removida");
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch {
            toast.error("Erro ao remover nota");
        } finally {
            setDeleting(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleCreate();
        }
    };

    return (
        <div className="space-y-4">
            {/* Input */}
            <div className="space-y-2">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva uma nota sobre este lead..."
                    rows={3}
                    maxLength={2000}
                    className="resize-none"
                />
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {content.length}/2000 · Cmd+Enter para salvar
                    </span>
                    <Button
                        size="sm"
                        onClick={handleCreate}
                        disabled={loading || !content.trim()}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                            <Plus className="h-4 w-4 mr-1" />
                        )}
                        Adicionar
                    </Button>
                </div>
            </div>

            {/* Notes List */}
            {fetching ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma nota ainda</p>
                    <p className="text-xs">Adicione anotações para manter o contexto do atendimento</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="group relative rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                        >
                            <p className="text-sm whitespace-pre-wrap pr-8">{note.content}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(note.createdAt), {
                                        addSuffix: true,
                                        locale: ptBR,
                                    })}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(note.id)}
                                disabled={deleting === note.id}
                            >
                                {deleting === note.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
