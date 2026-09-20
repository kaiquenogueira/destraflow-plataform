import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = "https://destraflow.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Destraflow Tech | CRM especialista em Orlando com IA integrada",
  description:
    "A Destraflow Tech implanta CRM especialista em Orlando com inteligência artificial integrada, atendimento automatizado no WhatsApp, cotações mais rápidas e equipe focada em fechar vendas.",
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Destraflow Tech",
    title: "Destraflow Tech | Mais tecnologia para vender mais Orlando",
    description:
      "CRM especialista em Orlando com inteligência artificial integrada. Agende uma vídeo conferência com nosso time.",
    images: [{ url: "/images/hero.png", width: 1200, height: 630, alt: "Destraflow Tech - Orlando" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: "/images/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={`${inter.className} bg-brand-black text-white antialiased selection:bg-[#c7a06b]/30 selection:text-white`}>
        <Header />
        <main>{children}</main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Destraflow Tech",
                legalName: "Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA",
                taxId: "59.459.911/0001-24",
                url: siteUrl,
                logo: `${siteUrl}/images/logo.jpg`,
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "contato@destraflow.com.br",
                  contactType: "customer service",
                  availableLanguage: "Portuguese",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "Destraflow Tech",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description:
                  "CRM especialista em agências de Orlando com inteligência artificial integrada no WhatsApp.",
                url: siteUrl,
                offers: {
                  "@type": "Offer",
                  availability: "https://schema.org/InStock",
                },
              },
            ]),
          }}
        />
      </body>
    </html>
  );
}
