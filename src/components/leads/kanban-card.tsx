"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar } from "lucide-react";
import type { Lead } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
        className="opacity-30 bg-background border-2 border-primary/50 rounded-lg h-[150px] w-full"
      />
    );
  }

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
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="font-semibold text-sm line-clamp-1">{lead.name}</h4>
              <p className="text-xs text-muted-foreground">{lead.phone}</p>
            </div>
            {lead.interest && (
              <Badge variant="outline" className="text-[10px] px-1 h-5 max-w-[80px] truncate">
                {lead.interest}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
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
