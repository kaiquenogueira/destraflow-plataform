"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Megaphone,
    MessageSquare,
    UserCog,
    FileText,
} from "lucide-react";

// Menus para clientes (USER)
const tenantItems = [
    {
        href: "/dashboard",
        label: "Início",
        icon: LayoutDashboard,
    },
    {
        href: "/leads",
        label: "Leads",
        icon: Users,
    },
    {
        href: "/campaigns",
        label: "Campanhas",
        icon: Megaphone,
    },
    {
        href: "/templates",
        label: "Templates",
        icon: FileText,
    },
    {
        href: "/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
    },
];

// Menus para admin
const adminItems = [
    {
        href: "/dashboard",
        label: "Início",
        icon: LayoutDashboard,
    },
    {
        href: "/admin/users",
        label: "Usuários",
        icon: UserCog,
    },
];

export function MobileNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN";

    const items = isAdmin ? adminItems : tenantItems;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 md:hidden">
            <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
                {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
