import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma, getTenantPrisma } from "@/lib/prisma";
import { createEvolutionClient } from "@/lib/evolution";
import { decrypt } from "@/lib/encryption";
import { StatsCard } from "@/components/dashboard/stats-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Users,
    Flame,
    Snowflake,
    ThermometerSun,
    UserX,
    UserCheck,
    MessageSquare,
    Send,
    Clock,
    UserCog,
    Plus,
    TrendingUp,
    Calendar,
    Phone
} from "lucide-react";
import { TAG_LABELS, TAG_COLORS, LeadTag } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

async function getAdminDashboardData() {
    const totalUsers = await prisma.crmUser.count();
    const admins = await prisma.crmUser.count({ where: { role: "ADMIN" } });
    const clients = await prisma.crmUser.count({ where: { role: "USER" } });
    const configuredClients = await prisma.crmUser.count({
        where: { role: "USER", databaseUrl: { not: null } },
    });

    return {
        totalUsers,
        admins,
        clients,
        configuredClients,
        isAdmin: true,
    };
}

async function getTenantDashboardData(userId: string) {
    const user = await prisma.crmUser.findUnique({
        where: { id: userId },
        select: {
            databaseUrl: true,
            evolutionInstance: true,
            evolutionApiKey: true,
        },
    }) as { databaseUrl: string | null; evolutionInstance: string | null; evolutionApiKey: string | null } | null;

    if (!user?.databaseUrl) {
        return {
            noDatabaseConfigured: true,
        };
    }

    const databaseUrl = decrypt(user.databaseUrl);
    const tenantPrisma = getTenantPrisma(databaseUrl);

    const [totalLeads, leadsByTag, pendingMessages, sentMessages, recentLeads] = await Promise.all([
        tenantPrisma.lead.count(),
        tenantPrisma.lead.groupBy({
            by: ["tag"],
            _count: true,
        }),
        tenantPrisma.campaignMessage.count({ where: { status: "PENDING" } }),
        tenantPrisma.campaignMessage.count({ where: { status: "SENT" } }),
        tenantPrisma.lead.findMany({
            orderBy: { updatedAt: "desc" },
            take: 5,
        }),
    ]);

    let evolutionStatus = { connected: false, state: "not_configured" };
    if (user.evolutionInstance) {
        try {
            const instanceName = decrypt(user.evolutionInstance);
            const apiKey = user.evolutionApiKey ? decrypt(user.evolutionApiKey) : undefined;

            const client = createEvolutionClient(
                instanceName,
                apiKey
            );
            evolutionStatus = await client.getInstanceStatus();
        } catch {
            evolutionStatus = { connected: false, state: "error" };
        }
    }

    const tagCounts = leadsByTag.reduce(
        (acc: Record<string, number>, item: { tag: string; _count: number }) => {
            acc[item.tag] = item._count;
            return acc;
        },
        { NEW: 0, QUALIFICATION: 0, PROSPECTING: 0, CALL: 0, MEETING: 0, RETURN: 0, LOST: 0, CUSTOMER: 0 }
    );

    return {
        totalLeads,
        tagCounts,
        evolutionStatus,
        pendingMessages,
        sentMessages,
        recentLeads,
        isAdmin: false,
    };
}

export default async function DashboardPage() {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) return null;

    const isAdmin = session.user.role === "ADMIN";

    // Dashboard Admin
    if (isAdmin) {
        const data = await getAdminDashboardData();

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Painel Admin</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie os usuários e clientes do CRM
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total de Usuários"
                        value={data.totalUsers}
                        icon={Users}
                        variant="default"
                    />
                    <StatsCard
                        title="Administradores"
                        value={data.admins}
                        icon={UserCog}
                        variant="info"
                    />
                    <StatsCard
                        title="Clientes"
                        value={data.clients}
                        icon={Users}
                        variant="success"
                    />
                    <StatsCard
                        title="Clientes Configurados"
                        value={data.configuredClients}
                        icon={UserCheck}
                        variant="warning"
                        description="Com banco de dados"
                    />
                </div>

                <div className="flex gap-4">
                    <Link href="/admin/users">
                        <Button size="lg">
                            <UserCog className="mr-2 h-4 w-4" />
                            Gerenciar Usuários
                        </Button>
                    </Link>
                    <Link href="/admin/users/new">
                        <Button size="lg" variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Cliente
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Dashboard Tenant
    const data = await getTenantDashboardData(session.user.id);

    if ("noDatabaseConfigured" in data && data.noDatabaseConfigured) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Visão geral do seu CRM de WhatsApp
                    </p>
                </div>
                <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-yellow-700 dark:text-yellow-400">
                        ⚠️ Banco de dados não configurado. Entre em contato com o administrador.
                    </p>
                </div>
            </div>
        );
    }

    const tagIcons: Record<LeadTag, any> = {
        NEW: Snowflake,
        QUALIFICATION: Users,
        PROSPECTING: TrendingUp,
        CALL: Phone,
        MEETING: Calendar,
        RETURN: Clock,
        LOST: UserX,
        CUSTOMER: UserCheck,
    };

    const tagVariants: Record<LeadTag, "info" | "warning" | "danger" | "default" | "success"> = {
        NEW: "info",
        QUALIFICATION: "default",
        PROSPECTING: "default",
        CALL: "warning",
        MEETING: "warning",
        RETURN: "default",
        LOST: "danger",
        CUSTOMER: "success",
    };

    const conversionRate = (data.totalLeads ?? 0) > 0
        ? ((data.tagCounts?.CUSTOMER || 0) / (data.totalLeads ?? 1)) * 100
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral do seu CRM de WhatsApp
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Status WhatsApp"
                    value={data.evolutionStatus?.connected ? "Conectado" : "Desconectado"}
                    icon={MessageSquare}
                    variant={data.evolutionStatus?.connected ? "success" : "danger"}
                    description={data.evolutionStatus?.state || "não configurado"}
                />
                <StatsCard
                    title="Total de Leads"
                    value={data.totalLeads ?? 0}
                    icon={Users}
                    variant="default"
                />
                <StatsCard
                    title="Taxa de Conversão"
                    value={`${conversionRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    variant="success"
                    description="Leads convertidos em clientes"
                />
                <StatsCard
                    title="Mensagens Pendentes"
                    value={data.pendingMessages ?? 0}
                    icon={Clock}
                    variant={(data.pendingMessages ?? 0) > 0 ? "warning" : "default"}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Leads por Status</h2>
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                            {(Object.keys(TAG_LABELS) as LeadTag[]).map((tag) => {
                                const Icon = tagIcons[tag];
                                return (
                                    <StatsCard
                                        key={tag}
                                        title={TAG_LABELS[tag]}
                                        value={data.tagCounts?.[tag] ?? 0}
                                        icon={Icon}
                                        variant={tagVariants[tag]}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="col-span-3">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Atividade Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.recentLeads && data.recentLeads.length > 0 ? (
                                    data.recentLeads.map((lead) => (
                                        <div key={lead.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="space-y-1">
                                                <p className="font-medium text-sm">{lead.name}</p>
                                                <p className="text-xs text-muted-foreground">{lead.phone}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className={cn("text-[10px] px-1 py-0", TAG_COLORS[lead.tag])}>
                                                    {TAG_LABELS[lead.tag]}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(lead.updatedAt, { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Nenhuma atividade recente
                                    </p>
                                )}
                                {data.recentLeads && data.recentLeads.length > 0 && (
                                    <Link href="/leads" className="block text-center mt-4">
                                        <Button variant="link" size="sm">
                                            Ver todos os leads
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

