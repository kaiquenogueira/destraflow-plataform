import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignForm } from "@/components/campaigns/campaign-form";

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
