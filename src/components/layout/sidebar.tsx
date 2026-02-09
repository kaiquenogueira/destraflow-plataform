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
    LogOut,
    ChevronLeft,
    ChevronRight,
    UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

// Menus para clientes (USER) - que têm banco de dados configurado
const tenantItems = [
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
        href: "/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
    },
];

// Menus para admin
const adminItems = [
    {
        href: "/admin/users",
        label: "Usuários",
        icon: UserCog,
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);

    const isAdmin = session?.user?.role === "ADMIN";

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
                {!collapsed && (
                    <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        DestraFlow
                    </h1>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="h-8 w-8"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1">
                {/* Dashboard - sempre visível */}
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        pathname === "/dashboard"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">Dashboard</span>}
                </Link>

                {/* Menus de Tenant - apenas para USER */}
                {!isAdmin && (
                    <>
                        {tenantItems.map((item) => {
                            const isActive =
                                pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span className="font-medium">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </>
                )}

                {/* Admin Section */}
                {isAdmin && (
                    <>
                        <Separator className="my-4" />
                        {!collapsed && (
                            <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Admin
                            </p>
                        )}
                        {adminItems.map((item) => {
                            const isActive =
                                pathname === item.href || pathname.startsWith(item.href + "/");
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    {!collapsed && <span className="font-medium">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </>
                )}
            </nav>

            {/* Logout */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                    variant="ghost"
                    className={cn("w-full justify-start gap-3 text-muted-foreground hover:text-destructive", collapsed && "justify-center")}
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Sair</span>}
                </Button>
            </div>
        </aside>
    );
}
