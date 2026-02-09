import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CampaignList } from "@/components/campaigns/campaign-list";
import { getCampaigns } from "@/actions/campaigns";
import { Plus } from "lucide-react";

export default async function CampaignsPage() {
    const data = await getCampaigns();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Campanhas</h1>
                    <p className="text-muted-foreground mt-1">
                        Crie e gerencie suas campanhas de WhatsApp
                    </p>
                </div>
                <Link href="/campaigns/new">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Campanha
                    </Button>
                </Link>
            </div>

            {/* List */}
            <CampaignList campaigns={data.campaigns} />
        </div>
    );
}
