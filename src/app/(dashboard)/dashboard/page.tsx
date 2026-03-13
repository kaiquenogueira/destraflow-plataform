import { Suspense } from "react";
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
    Phone,
    AlertTriangle,
    Zap,
    UserPlus
} from "lucide-react";
import { TAG_LABELS, TAG_COLORS, LeadTag } from "@/types";
import { formatDistanceToNow, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

async function getAdminDashboardData() {
    const [totalUsers, admins, clients, configuredClients] = await Promise.all([
        prisma.crmUser.count(),
        prisma.crmUser.count({ where: { role: "ADMIN" } }),
        prisma.crmUser.count({ where: { role: "USER" } }),
        prisma.crmUser.count({
            where: { role: "USER", databaseUrl: { not: null } },
        }),
    ]);

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

    const sevenDaysAgo = subDays(new Date(), 7);

    const [totalLeads, leadsByTag, pendingMessages, sentMessages, recentLeads, stagnantLeads, hotLeadsCount, newThisWeekCount] = await Promise.all([
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
        // Leads estagnados: sem update há 7+ dias, excluindo CUSTOMER e LOST
        tenantPrisma.lead.findMany({
            where: {
                updatedAt: { lt: sevenDaysAgo },
                tag: { notIn: ["CUSTOMER", "LOST"] },
            },
            orderBy: { updatedAt: "asc" },
            take: 5,
        }),
        // Leads quentes: aiPotential contém "alta" ou "alto"
        tenantPrisma.lead.count({
            where: {
                OR: [
                    { aiPotential: { contains: "alta", mode: "insensitive" } },
                    { aiPotential: { contains: "alto", mode: "insensitive" } },
                ],
            },
        }),
        // Novos esta semana
        tenantPrisma.lead.count({
            where: { createdAt: { gte: sevenDaysAgo } },
        }),
    ]);

    const evolutionInstance = user.evolutionInstance;
    const evolutionApiKey = user.evolutionApiKey;

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
        evolutionInstance,
        evolutionApiKey,
        pendingMessages,
        sentMessages,
        recentLeads,
        stagnantLeads,
        hotLeadsCount,
        newThisWeekCount,
        isAdmin: false,
    };
}

async function WhatsAppStatusCard({ evolutionInstance, evolutionApiKey }: { evolutionInstance: string | null; evolutionApiKey: string | null }) {
    let evolutionStatus = { connected: false, state: "not_configured" };
    if (evolutionInstance) {
        try {
            const instanceName = decrypt(evolutionInstance);
            const apiKey = evolutionApiKey ? decrypt(evolutionApiKey) : undefined;
            const client = createEvolutionClient(instanceName, apiKey);
            evolutionStatus = await client.getInstanceStatus();
        } catch {
            evolutionStatus = { connected: false, state: "error" };
        }
    }
    return (
        <StatsCard
            title="Status WhatsApp"
            value={evolutionStatus.connected ? "Conectado" : "Desconectado"}
            icon={MessageSquare}
            variant={evolutionStatus.connected ? "success" : "danger"}
            description={evolutionStatus.state || "não configurado"}
        />
    );
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
                <Suspense fallback={
                    <StatsCard
                        title="Status WhatsApp"
                        value="Verificando..."
                        icon={MessageSquare}
                        variant="default"
                        description="carregando"
                    />
                }>
                    <WhatsAppStatusCard
                        evolutionInstance={data.evolutionInstance ?? null}
                        evolutionApiKey={data.evolutionApiKey ?? null}
                    />
                </Suspense>
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
                    {/* Insights do Funil */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            Insights do Funil
                        </h2>
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                            <StatsCard
                                title="Leads Estagnados"
                                value={data.stagnantLeads?.length ?? 0}
                                icon={AlertTriangle}
                                variant={(data.stagnantLeads?.length ?? 0) > 0 ? "warning" : "default"}
                                description="Sem movimento há 7+ dias"
                            />
                            <StatsCard
                                title="Leads Quentes"
                                value={data.hotLeadsCount ?? 0}
                                icon={Flame}
                                variant={(data.hotLeadsCount ?? 0) > 0 ? "success" : "default"}
                                description="Potencial alto (IA)"
                            />
                            <StatsCard
                                title="Novos esta Semana"
                                value={data.newThisWeekCount ?? 0}
                                icon={UserPlus}
                                variant={(data.newThisWeekCount ?? 0) > 0 ? "info" : "default"}
                                description="Últimos 7 dias"
                            />
                        </div>
                    </div>

                    {/* Leads por Status */}
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

                <div className="col-span-3 space-y-6">
                    {/* Leads Estagnados */}
                    {data.stagnantLeads && data.stagnantLeads.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Leads Estagnados
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.stagnantLeads.map((lead) => (
                                        <div key={lead.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="space-y-1">
                                                <p className="font-medium text-sm">{lead.name}</p>
                                                <Badge className={cn("text-[10px] px-1 py-0", TAG_COLORS[lead.tag])}>
                                                    {TAG_LABELS[lead.tag]}
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                    {differenceInDays(new Date(), lead.updatedAt)}d
                                                </span>
                                                <p className="text-[10px] text-muted-foreground">sem movimento</p>
                                            </div>
                                        </div>
                                    ))}
                                    <Link href="/leads?orderBy=updatedAt&orderDirection=asc" className="block text-center mt-2">
                                        <Button variant="link" size="sm">
                                            Ver todos estagnados
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Atividade Recente */}
                    <Card className="h-fit">
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

