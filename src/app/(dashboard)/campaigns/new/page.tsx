import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

const CampaignForm = dynamic(
    () => import("@/components/campaigns/campaign-form").then(m => m.CampaignForm),
    { loading: () => <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando formulário...</div> }
);

export default function NewCampaignPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Nova Campanha</CardTitle>
                </CardHeader>
                <CardContent>
                    <CampaignForm />
                </CardContent>
            </Card>
        </div>
    );
}
