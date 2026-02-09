import { UserForm } from "@/components/admin/user-form";

export default function NewUserPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Novo Usuário</h1>
                <p className="text-muted-foreground mt-1">
                    Cadastre um novo usuário no CRM
                </p>
            </div>
            <UserForm />
        </div>
    );
}
