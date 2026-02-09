import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LeadList } from "@/components/leads/lead-list";
import { getLeads } from "@/actions/leads";
import { TAG_LABELS, type LeadTag } from "@/types";
import { Plus, Search, AlertTriangle } from "lucide-react";

interface LeadsPageProps {
    searchParams: Promise<{ search?: string; tag?: string; page?: string }>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
    const params = await searchParams;
    const search = params.search || "";
    const tag = params.tag as LeadTag | undefined;
    const page = parseInt(params.page || "1", 10);

    const data = await getLeads({ search, tag, page });

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
            <div className="flex flex-col sm:flex-row gap-3">
                <form className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        name="search"
                        placeholder="Buscar por nome ou telefone..."
                        defaultValue={search}
                        className="pl-10 h-12"
                    />
                </form>
                <form>
                    <Select name="tag" defaultValue={tag || "all"}>
                        <SelectTrigger className="w-full sm:w-[180px] h-12">
                            <SelectValue placeholder="Todas as tags" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as tags</SelectItem>
                            {Object.entries(TAG_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </form>
            </div>

            {/* List */}
            <LeadList leads={data.leads} />

            {/* Pagination */}
            {data.pages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                        <Link
                            key={p}
                            href={`/leads?page=${p}${search ? `&search=${search}` : ""}${tag ? `&tag=${tag}` : ""}`}
                        >
                            <Button
                                variant={p === data.currentPage ? "default" : "outline"}
                                size="sm"
                            >
                                {p}
                            </Button>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
