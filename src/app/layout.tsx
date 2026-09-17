import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = "https://www.destraflow.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Destraflow — CRM com IA no WhatsApp para agências de viagem",
  description:
    "Sua agência responde todo lead de viagem em segundos, qualifica e chega na cotação, sem contratar mais atendentes. IA no WhatsApp feita para agências de viagem.",
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Destraflow",
    title: "Destraflow — CRM com IA no WhatsApp para agências de viagem",
    description:
      "Atendente de IA no WhatsApp que qualifica leads de viagem 24/7 e conduz até a cotação. Feito para agências de viagem.",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Destraflow" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${plusJakarta.className} antialiased`}>
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
                name: "Destraflow",
                legalName: "Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA",
                taxId: "59.459.911/0001-24",
                url: siteUrl,
                logo: `${siteUrl}/images/logo.png`,
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
                name: "Destraflow",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description:
                  "CRM com atendente de IA no WhatsApp para agências de viagem. Qualifica leads 24/7 e conduz até a cotação.",
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
