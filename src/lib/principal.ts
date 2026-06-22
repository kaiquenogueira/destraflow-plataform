import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export interface Principal {
    id: string;
    role: "ADMIN" | "USER";
}

/**
 * Valida a sessão e devolve o principal (CRM DB).
 * Dono único do vocabulário de erro de identidade ("Não autorizado" / "Usuário não encontrado").
 * Consumido pelos gates de borda do app (requireAdmin, getOptionalTenantContext).
 */
export async function validatePrincipal(session: Session | null): Promise<Principal> {
    if (!session?.user?.id) {
        throw new Error("Não autorizado");
    }

    const user = await prisma.crmUser.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
    });

    if (!user) {
        throw new Error("Usuário não encontrado");
    }

    return user;
}
