import { getUserById } from "@/actions/admin";
import { UserForm } from "@/components/admin/user-form";
import { notFound } from "next/navigation";

export default async function EditUserPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    try {
        const user = await getUserById(id);

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Editar Usuário</h1>
                    <p className="text-muted-foreground mt-1">
                        Atualize os dados do usuário
                    </p>
                </div>
                <UserForm user={user} />
            </div>
        );
    } catch {
        notFound();
    }
}
