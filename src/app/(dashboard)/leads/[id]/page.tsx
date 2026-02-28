import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/components/leads/lead-form";
import { MessageHistory } from "@/components/leads/message-history";
import { getLeadById } from "@/actions/leads";
import { PenLine, MessageSquare } from "lucide-react";

interface EditLeadPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
    const { id } = await params;
    let lead;

    try {
        lead = await getLeadById(id);
    } catch {
        notFound();
    }

    if (!lead) {
        notFound();
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* Formulário de Edição */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PenLine className="h-5 w-5" />
                        Editar Lead
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <LeadForm lead={lead} />
                </CardContent>
            </Card>

            {/* Histórico de Mensagens */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Histórico de Mensagens
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-[400px]">
                    <MessageHistory leadId={id} />
                </CardContent>
            </Card>
        </div>
    );
}
