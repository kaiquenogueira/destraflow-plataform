import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Verificar se é admin
    const user = await prisma.crmUser.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== "ADMIN") {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
