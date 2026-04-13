import { notFound } from "next/navigation";
import { getCampaignById } from "@/actions/campaigns";
import { CampaignMessages } from "@/components/campaigns/campaign-messages";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  try {
    const campaign = await getCampaignById(id);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground mt-1">
            Detalhes da campanha e status de envio
          </p>
        </div>

        <CampaignMessages
          campaignId={id}
          messages={campaign.messages}
          statusCounts={campaign.statusCounts}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
