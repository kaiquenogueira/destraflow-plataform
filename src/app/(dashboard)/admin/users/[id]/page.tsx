import { getUserById, getUserNotifications } from "@/actions/admin";
import { UserForm } from "@/components/admin/user-form";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "@/components/notifications/notification-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncDatabaseButton } from "@/components/admin/sync-database-button";

export default async function EditUserPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    let user;
    let notifications;

    try {
        [user, notifications] = await Promise.all([
            getUserById(id),
            getUserNotifications(id),
        ]);
    } catch {
        notFound();
    }

    if (!user || !notifications) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Gerenciar Usuário</h1>
                    <p className="text-muted-foreground mt-1">
                        Edite informações e veja o histórico de notificações
                    </p>
                </div>
                <SyncDatabaseButton 
                    userId={user.id} 
                    hasDatabaseUrl={!!user.databaseUrl} 
                />
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList>
                    <TabsTrigger value="details">Dados Cadastrais</TabsTrigger>
                    <TabsTrigger value="notifications">
                        Notificações Externas ({notifications.length})
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-4">
                    <UserForm user={user} />
                </TabsContent>
                
                <TabsContent value="notifications" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Transbordos</CardTitle>
                            <CardDescription>
                                Notificações recebidas do sistema externo para este usuário.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NotificationList notifications={notifications} isAdminView={true} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
