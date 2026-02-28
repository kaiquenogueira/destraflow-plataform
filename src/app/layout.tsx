import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DestraFlow — Agentes de IA e Automação Empresarial",
  description: "Transforme seu atendimento e processos com agentes de IA inteligentes. Automação, eficiência e ROI comprovado para empresas que querem escalar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased text-slate-800 dark:text-slate-200`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
