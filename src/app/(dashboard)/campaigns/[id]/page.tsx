import { notFound } from "next/navigation";
import { getCampaignById } from "@/actions/campaigns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaign._count.messages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {campaign.statusCounts?.SENT || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(campaign.statusCounts?.PENDING || 0) + (campaign.statusCounts?.PROCESSING || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {campaign.statusCounts?.FAILED || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Status dos Envios</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Agendado para</TableHead>
                            <TableHead>Enviado em</TableHead>
                            <TableHead>Erro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {campaign.messages.map((message) => (
                            <TableRow key={message.id}>
                                <TableCell>{message.lead.name}</TableCell>
                                <TableCell>{message.lead.phone}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        message.status === 'SENT' ? 'default' : 
                                        message.status === 'FAILED' ? 'destructive' :
                                        message.status === 'PROCESSING' ? 'secondary' :
                                        'outline'
                                    }>
                                        {message.status === 'SENT' ? 'Enviado' :
                                         message.status === 'FAILED' ? 'Falhou' :
                                         message.status === 'PROCESSING' ? 'Enviando' :
                                         'Pendente'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(message.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                    {message.sentAt 
                                        ? format(new Date(message.sentAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                        : "-"}
                                </TableCell>
                                <TableCell className="text-red-500 text-sm max-w-[200px] truncate" title={message.error || ""}>
                                    {message.error || "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
