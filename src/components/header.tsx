import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#08090a]/80 py-3 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group" aria-label="Destraflow Tech">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#c7a06b]/30 shadow-md">
            <Image
              src="/images/logo.jpg"
              alt="Destraflow Tech Logo"
              width={40}
              height={40}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-white leading-none">
              Destraflow
            </span>
            <span className="mt-1 text-[9px] font-bold tracking-[0.36em] text-[#e3c79b] leading-none uppercase">
              Tech
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-[13.5px] text-[#c9c5be] md:flex" aria-label="Navegação principal">
          <a href="#solucao" className="transition-colors hover:text-white">
            Solução
          </a>
          <a href="#entregas" className="transition-colors hover:text-white">
            O que implantamos
          </a>
          <a href="#como" className="transition-colors hover:text-white">
            Como funciona
          </a>
          <a href="#equipe" className="transition-colors hover:text-white">
            Quem somos
          </a>
          <a href="#faq" className="transition-colors hover:text-white">
            Dúvidas
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://crm.destraflow.com.br/login"
            className="hidden text-xs font-semibold text-[#a8a39b] transition-colors hover:text-white sm:inline-block px-3 py-2"
          >
            Entrar
          </a>
          <a
            href="#agendar"
            className="btn-gold !py-2.5 !px-4 !text-xs sm:!px-5 sm:!text-sm"
          >
            <span className="hidden sm:inline">Agendar vídeo conferência</span>
            <span className="sm:hidden">Agendar</span>
          </a>
        </div>
      </div>
    </header>
  );
}
