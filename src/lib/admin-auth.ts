import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin() {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
        throw new Error("Não autorizado");
    }

    const user = await prisma.crmUser.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "ADMIN") {
        throw new Error("Acesso negado. Apenas administradores.");
    }

    return session.user.id;
}
