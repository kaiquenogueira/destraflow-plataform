import { getUsers } from "@/actions/admin";
import { UsersTable } from "@/components/admin/users-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Usuários</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie os usuários do CRM
                    </p>
                </div>
                <Link href="/admin/users/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Usuário
                    </Button>
                </Link>
            </div>

            {/* Tabela */}
            <UsersTable users={users} />
        </div>
    );
}
