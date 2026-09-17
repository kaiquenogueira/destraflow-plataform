import Link from "next/link";
import Image from "next/image";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="text-lg font-bold text-foreground">Destraflow</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              CRM com atendente de IA no WhatsApp para agências de viagem.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Páginas legais</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/politica-de-privacidade" className="text-sm text-muted-foreground hover:text-foreground">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="text-sm text-muted-foreground hover:text-foreground">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/exclusao-de-dados" className="text-sm text-muted-foreground hover:text-foreground">
                  Exclusão de Dados
                </Link>
              </li>
              <li>
                <Link href="/politica-de-reembolso" className="text-sm text-muted-foreground hover:text-foreground">
                  Política de Reembolso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Contato</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>contato@destraflow.com.br</li>
              <li>Privacidade/dados: privacidade@destraflow.com.br</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA · CNPJ: 59.459.911/0001-24 · Av. Paulista, 1106, Sala 01 Andar 16, Bela Vista, São Paulo - SP, CEP 01.310-914
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            © {currentYear} Destraflow. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
