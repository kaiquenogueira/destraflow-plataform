import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/components/leads/lead-form";
import { getLeadById } from "@/actions/leads";

interface EditLeadPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
    const { id } = await params;

    try {
        const lead = await getLeadById(id);

        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Editar Lead</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LeadForm lead={lead} />
                    </CardContent>
                </Card>
            </div>
        );
    } catch {
        notFound();
    }
}
