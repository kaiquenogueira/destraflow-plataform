import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { href: "/#solucao", label: "Solução" },
  { href: "/#entregas", label: "O que fazemos" },
  { href: "/#como", label: "Como funciona" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#faq", label: "Dúvidas" },
];

const legal = [
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/termos-de-uso", label: "Termos de Uso" },
  { href: "/exclusao-de-dados", label: "Exclusão de Dados" },
  { href: "/politica-de-reembolso", label: "Política de Reembolso" },
];

export function Footer() {
  return (
    <footer data-theme="dark" className="border-t border-border bg-background pb-28 pt-12 text-foreground sm:pb-16 sm:pt-16">
      <div className="site-container">
        <div className="grid gap-8 border-b border-border pb-10 sm:gap-12 sm:pb-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <Link href="/" aria-label="Destraflow Tech — início" className="inline-flex text-foreground">
              <BrandMark />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              CRM e inteligência artificial para agências de viagens que vendem Orlando.
              A equipe acompanha a configuração e o uso da plataforma.
            </p>
            <span className="site-rule mt-6" aria-hidden="true" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Explorar</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {navigation.map((item) => (
                <li key={item.href}><Link href={item.href} className="inline-flex min-h-11 items-center hover:text-foreground">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Informações legais</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              {legal.map((item) => (
                <li key={item.href}><Link href={item.href} className="inline-flex min-h-11 items-center hover:text-foreground">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Contato oficial</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>contato@destraflow.com.br</li>
              <li>privacidade@destraflow.com.br</li>
              <li>Atendimento: Seg à Sex das 14h às 20h (horário de Brasília).</li>
            </ul>
            <Link href="/#agendar" className="mt-5 inline-flex min-h-11 items-center text-sm text-gold underline decoration-signature underline-offset-4">
              Agendar conversa
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-xs leading-relaxed text-muted md:flex-row md:justify-between">
          <p className="max-w-3xl">
            Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA · CNPJ: 59.459.911/0001-24 · Av. Paulista, 1106, Sala 01 Andar 16, Bela Vista, São Paulo - SP, CEP 01.310-914
          </p>
          <p>© {new Date().getFullYear()} Destraflow Tech. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
