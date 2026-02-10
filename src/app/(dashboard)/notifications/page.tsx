import { getNotifications } from "@/actions/notifications";
import { NotificationList } from "@/components/notifications/notification-list";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Notificações | DestraFlow",
    description: "Histórico de notificações externas",
};

export default async function NotificationsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; startDate?: string; endDate?: string }>;
}) {
    const { page, startDate, endDate } = await searchParams;
    const currentPage = Number(page) || 1;
    
    const { notifications, total, pages } = await getNotifications({
        page: currentPage,
        limit: 20,
        startDate,
        endDate,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Notificações</h1>
                    <p className="text-muted-foreground mt-1">
                        Histórico de notificações e transbordos do sistema
                    </p>
                </div>
            </div>

            <NotificationList notifications={notifications} />

            {/* TODO: Adicionar componente de paginação se necessário, similar ao de Leads */}
        </div>
    );
}
