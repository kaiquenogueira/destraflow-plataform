import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/components/leads/lead-form";

export default function NewLeadPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Novo Lead</CardTitle>
                </CardHeader>
                <CardContent>
                    <LeadForm />
                </CardContent>
            </Card>
        </div>
    );
}
