import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeadList } from "@/components/leads/lead-list";
import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
    () => import("@/components/leads/kanban-board").then(m => m.KanbanBoard),
    { loading: () => <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando Kanban...</div> }
);
import { getLeads } from "@/actions/leads";
import { type LeadTag } from "@/types";
import { Plus, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { Pagination } from "@/components/ui/custom-pagination";
import { LeadFilters } from "@/components/leads/lead-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadsPageProps {
    searchParams: Promise<{
        search?: string;
        tag?: string;
        page?: string;
        date?: string;
        view?: string;
        aiPotential?: string;
        orderBy?: string;
        orderDirection?: "asc" | "desc";
    }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
    const params = await searchParams;
    const search = params.search || "";
    const tag = params.tag as LeadTag | undefined;
    const page = parseInt(params.page || "1", 10);
    const date = params.date || "";
    const view = params.view || "list";
    const aiPotential = params.aiPotential || "";
    const orderBy = params.orderBy || "updatedAt";
    const orderDirection = params.orderDirection || "desc";

    // For Kanban, we need more leads (or ideally all, but let's stick to pagination for now or increase limit)
    // If view is kanban, we might want to fetch differently.
    // For now, let's keep it simple and just show current page on Kanban,
    // but typically Kanban shows ALL leads.
    // Let's increase limit for Kanban view to make it useful.
    const limit = view === "kanban" ? 100 : 20;

    const data = await getLeads({
        search,
        tag,
        page,
        limit,
        date,
        aiPotential,
        orderBy,
        orderDirection
    });

    // Mostrar mensagem se não tem banco configurado
    if ("noDatabaseConfigured" in data && data.noDatabaseConfigured) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie seus leads e contatos
                    </p>
                </div>
                <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300">
                            Banco de dados não configurado
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                            Seu usuário não possui um banco de dados configurado.
                            Entre em contato com o administrador para configurar seu acesso.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie seus leads e contatos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/leads/new">
                        <Button size="lg" className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Lead
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs defaultValue={view} className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="list" asChild>
                            <Link href={{
                                pathname: "/leads",
                                query: { ...params, view: "list", page: 1 } // Reset page on view switch? Or keep it? keeping params mostly
                            }}>
                                <List className="mr-2 h-4 w-4" />
                                Lista
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="kanban" asChild>
                            <Link href={{
                                pathname: "/leads",
                                query: { ...params, view: "kanban" }
                            }}>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Kanban
                            </Link>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="space-y-6">
                    {/* Filters only show in List view for now as Kanban filters are columns themselves */}
                    <LeadFilters />

                    <LeadList leads={data.leads} />

                    <div className="py-4">
                        <Pagination
                            currentPage={data.currentPage}
                            totalPages={data.pages}
                            createUrl={(page) => {
                                const params = new URLSearchParams();
                                params.set("view", "list");
                                params.set("page", page.toString());
                                if (search) params.set("search", search);
                                if (tag) params.set("tag", tag);
                                if (date) params.set("date", date);
                                if (aiPotential) params.set("aiPotential", aiPotential);
                                if (orderBy) params.set("orderBy", orderBy);
                                if (orderDirection) params.set("orderDirection", orderDirection);
                                return `/leads?${params.toString()}`;
                            }}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="kanban" className="flex-1 overflow-hidden">
                    <div className="mb-4">
                        {/* Optional: Filter by name even in Kanban */}
                        <LeadFilters />
                    </div>
                    <KanbanBoard initialLeads={data.leads} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
