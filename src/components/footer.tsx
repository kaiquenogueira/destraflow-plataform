import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.08] bg-[#08090a] pt-12 sm:pt-14 pb-28 sm:pb-14 text-xs text-[#8d8880]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Destraflow Tech">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#c7a06b]/30">
                <Image src="/images/logo.jpg" alt="Destraflow Tech" width={32} height={32} className="h-full w-full object-cover" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">Destraflow <span className="text-[10px] tracking-widest text-[#e3c79b]">TECH</span></span>
            </Link>
            <p className="text-xs leading-relaxed text-[#a8a39b]">
              Tecnologia e inteligência artificial para agências que vendem Orlando. CRM especialista, atendimento automatizado e operação de alta conversão.
            </p>
            <div className="text-[11px] text-[#7c776f]">
              Atendimento: Seg à Sex das 14h às 20h (horário de Brasília).
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Navegação</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="#solucao" className="transition-colors hover:text-[#e3c79b]">
                  A Solução
                </a>
              </li>
              <li>
                <a href="#entregas" className="transition-colors hover:text-[#e3c79b]">
                  O que implantamos
                </a>
              </li>
              <li>
                <a href="#como" className="transition-colors hover:text-[#e3c79b]">
                  Como funciona
                </a>
              </li>
              <li>
                <a href="#equipe" className="transition-colors hover:text-[#e3c79b]">
                  Quem somos
                </a>
              </li>
              <li>
                <a href="#faq" className="transition-colors hover:text-[#e3c79b]">
                  Perguntas frequentes
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Páginas Legais</h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/politica-de-privacidade" className="transition-colors hover:text-[#e3c79b]">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="transition-colors hover:text-[#e3c79b]">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/exclusao-de-dados" className="transition-colors hover:text-[#e3c79b]">
                  Exclusão de Dados
                </Link>
              </li>
              <li>
                <Link href="/politica-de-reembolso" className="transition-colors hover:text-[#e3c79b]">
                  Política de Reembolso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contato Oficial</h4>
            <ul className="mt-4 space-y-2.5">
              <li className="text-[#a8a39b]">contato@destraflow.com.br</li>
              <li className="text-[#a8a39b]">privacidade@destraflow.com.br</li>
              <li className="pt-2">
                <a
                  href="#agendar"
                  className="inline-block text-[#e3c79b] hover:underline font-semibold"
                >
                  Agendar reunião por vídeo →
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.08] pt-8 space-y-2">
          <p className="text-[11px] leading-relaxed text-[#6d6961]">
            Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA · CNPJ: 59.459.911/0001-24 · Av. Paulista, 1106, Sala 01 Andar 16, Bela Vista, São Paulo - SP, CEP 01.310-914
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-[#6d6961] pt-1">
            <span>© {currentYear} Destraflow Tech. Todos os direitos reservados.</span>
            <span className="mt-1 sm:mt-0 text-[#8d8880]">CRM com IA no WhatsApp para quem vende Orlando</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
