import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authConfig);

    if (!session) {
        redirect("/login");
    }

    return (
        <Providers>
            <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />

                    <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
                        <div className="container mx-auto px-4 py-6 max-w-7xl">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Mobile Bottom Navigation */}
                <MobileNav />
            </div>
        </Providers>
    );
}
