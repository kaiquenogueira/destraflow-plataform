import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getTemplates } from "@/actions/templates";
import { TemplateList } from "@/components/templates/template-list";

export default async function TemplatesPage() {
    const templates = await getTemplates();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Meus Templates</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie os modelos de mensagem para suas campanhas
                    </p>
                </div>
                <Link href="/templates/new">
                    <Button size="lg" className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Template
                    </Button>
                </Link>
            </div>

            <TemplateList templates={templates} />
        </div>
    );
}
