
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, Calendar, MessageSquare, Star, Activity, FileText } from "lucide-react";
import { type Lead } from "@/types";

interface LeadDetailsModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

export function LeadDetailsModal({ lead, open, onClose }: LeadDetailsModalProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-6 w-6 text-primary" />
            Análise de IA - {lead.name}
          </DialogTitle>
          <DialogDescription>
            Detalhes da análise realizada pela inteligência artificial para este lead.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Cabeçalho com Score e Potencial */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-medium">Potencial</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${
                    lead.aiPotential?.toLowerCase().includes('alta') || lead.aiPotential?.toLowerCase().includes('alto') 
                      ? 'text-green-600' 
                      : 'text-purple-600 dark:text-purple-400'
                  }`}>
                    {lead.aiPotential || "Não analisado"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Score</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {lead.aiScore ?? "-"}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>

            {/* Ação Recomendada */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Ação Recomendada
              </h4>
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm border border-blue-100 dark:border-blue-900">
                {lead.aiAction || "Nenhuma ação específica recomendada."}
              </div>
            </div>

            {/* Resumo da Análise */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Resumo da Análise
              </h4>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {lead.aiSummary || "Nenhum resumo disponível."}
              </div>
            </div>

            {/* Sugestão de Mensagem */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Sugestão de Mensagem
              </h4>
              <div className="p-4 rounded-md bg-slate-100 dark:bg-slate-800 text-sm italic border-l-4 border-primary">
                "{lead.aiMessageSuggestion || "Nenhuma sugestão disponível."}"
              </div>
            </div>

            {/* Metadados */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Última análise: {lead.aiLastAnalyzedAt 
                  ? format(new Date(lead.aiLastAnalyzedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                  : "Nunca analisado"}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
