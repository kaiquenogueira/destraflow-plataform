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
} from "lucide-react";
import { TAG_LABELS, LeadTag } from "@/types";

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

    const [totalLeads, leadsByTag, pendingMessages, sentMessages] = await Promise.all([
        tenantPrisma.lead.count(),
        tenantPrisma.lead.groupBy({
            by: ["tag"],
            _count: true,
        }),
        tenantPrisma.campaignMessage.count({ where: { status: "PENDING" } }),
        tenantPrisma.campaignMessage.count({ where: { status: "SENT" } }),
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
        { COLD: 0, WARM: 0, HOT: 0, LOST: 0, CUSTOMER: 0 }
    );

    return {
        totalLeads,
        tagCounts,
        evolutionStatus,
        pendingMessages,
        sentMessages,
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

    const tagIcons: Record<LeadTag, typeof Snowflake> = {
        COLD: Snowflake,
        WARM: ThermometerSun,
        HOT: Flame,
        LOST: UserX,
        CUSTOMER: UserCheck,
    };

    const tagVariants: Record<LeadTag, "info" | "warning" | "danger" | "default" | "success"> = {
        COLD: "info",
        WARM: "warning",
        HOT: "danger",
        LOST: "default",
        CUSTOMER: "success",
    };

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
                    title="Mensagens Pendentes"
                    value={data.pendingMessages ?? 0}
                    icon={Clock}
                    variant={(data.pendingMessages ?? 0) > 0 ? "warning" : "default"}
                />
                <StatsCard
                    title="Mensagens Enviadas"
                    value={data.sentMessages ?? 0}
                    icon={Send}
                    variant="success"
                />
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4">Leads por Status</h2>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
    );
}
