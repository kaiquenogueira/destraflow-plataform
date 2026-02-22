"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Calendar, Sparkles } from "lucide-react";
import type { Lead } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: Lead;
}

export function KanbanCard({ lead }: KanbanCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-background border-2 border-primary/50 rounded-lg min-h-[150px] w-full"
      />
    );
  }

  // Define color for AI Score
  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    if (score >= 50) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  };

  const aiText = lead.aiAction || lead.aiSummary;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <Card className="hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start gap-3">
            <div className="flex gap-2 items-start overflow-hidden">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs uppercase bg-primary/10 text-primary">
                  {lead.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <h4 className="font-semibold text-sm truncate">{lead.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
              </div>
            </div>
            {lead.aiScore ? (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 shrink-0 tabular-nums flex items-center gap-1", getScoreColor(lead.aiScore))}>
                <Sparkles className="h-3 w-3" />
                {lead.aiScore}
              </Badge>
            ) : lead.interest ? (
              <Badge variant="outline" className="text-[10px] px-1 h-5 max-w-[80px] truncate shrink-0">
                {lead.interest}
              </Badge>
            ) : null}
          </div>

          {aiText && (
            <div className="bg-muted/50 rounded-md p-2 text-xs text-muted-foreground italic line-clamp-2">
              {aiText}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t mt-auto">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(lead.updatedAt), "dd/MM", { locale: ptBR })}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir WhatsApp"
              >
                <MessageSquare className="h-3 w-3 text-green-500" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
