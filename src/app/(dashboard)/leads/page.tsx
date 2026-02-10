import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeadList } from "@/components/leads/lead-list";
import { getLeads } from "@/actions/leads";
import { type LeadTag } from "@/types";
import { Plus, AlertTriangle } from "lucide-react";
import { Pagination } from "@/components/ui/custom-pagination";
import { LeadFilters } from "@/components/leads/lead-filters";

interface LeadsPageProps {
    searchParams: Promise<{ search?: string; tag?: string; page?: string; date?: string }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
    const params = await searchParams;
    const search = params.search || "";
    const tag = params.tag as LeadTag | undefined;
    const page = parseInt(params.page || "1", 10);
    const date = params.date || "";

    const data = await getLeads({ search, tag, page, date });

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie seus leads e contatos
                    </p>
                </div>
                <Link href="/leads/new">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Lead
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <LeadFilters />

            {/* List */}
            <LeadList leads={data.leads} />

            {/* Pagination */}
            <div className="py-4">
                <Pagination
                    currentPage={data.currentPage}
                    totalPages={data.pages}
                    createUrl={(page) => `/leads?page=${page}${search ? `&search=${search}` : ""}${tag ? `&tag=${tag}` : ""}${date ? `&date=${date}` : ""}`}
                />
            </div>
        </div>
    );
}
