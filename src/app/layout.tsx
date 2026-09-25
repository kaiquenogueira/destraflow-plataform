import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { lightPalette, platformBrand } from "@destraflow/brand";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: lightPalette.background,
};

export const metadata: Metadata = {
  metadataBase: new URL(platformBrand.siteUrl),
  title: `${platformBrand.name} | CRM para agências que vendem Orlando`,
  description:
    "CRM e inteligência artificial para agências de viagens que vendem Orlando. Atendimento no WhatsApp, cotações e acompanhamento em uma plataforma.",
  alternates: {
    canonical: platformBrand.siteUrl,
    types: { "text/markdown": "/llms.txt" },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: platformBrand.siteUrl,
    siteName: platformBrand.name,
    title: `${platformBrand.name} | CRM para agências que vendem Orlando`,
    description: "Atendimento, cotações e acompanhamento no mesmo fluxo.",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Destraflow Tech — CRM para agências que vendem Orlando" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/icon", apple: "/icon" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={inter.className}>
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
                name: platformBrand.name,
                legalName: "Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA",
                taxId: "59.459.911/0001-24",
                url: platformBrand.siteUrl,
                logo: `${platformBrand.siteUrl}/icon`,
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
                name: platformBrand.name,
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description: "CRM e inteligência artificial para agências de viagens que vendem Orlando.",
                url: platformBrand.siteUrl,
              },
            ]),
          }}
        />
      </body>
    </html>
  );
}
