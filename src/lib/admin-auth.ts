import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { validatePrincipal } from "@/lib/principal";

export async function requireAdmin() {
    const session = await getServerSession(authConfig);
    const principal = await validatePrincipal(session);

    if (principal.role !== "ADMIN") {
        throw new Error("Acesso negado. Apenas administradores.");
    }

    return principal.id;
}
