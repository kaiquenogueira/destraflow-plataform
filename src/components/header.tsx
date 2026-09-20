"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, LogIn, Calendar } from "lucide-react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu on Escape key or on screen resize to desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navLinks = [
    { href: "#solucao", label: "Solução" },
    { href: "#entregas", label: "O que implantamos" },
    { href: "#como", label: "Como funciona" },
    { href: "#equipe", label: "Quem somos" },
    { href: "#faq", label: "Dúvidas" },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#08090a]/85 py-3 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 group"
            aria-label="Destraflow Tech Início"
          >
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-xl border border-[#c7a06b]/30 shadow-md">
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
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                Destraflow
              </span>
              <span className="mt-1 text-[8.5px] sm:text-[9px] font-bold tracking-[0.32em] text-[#e3c79b] leading-none uppercase">
                Tech
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-7 text-[13.5px] text-[#c9c5be] md:flex"
            aria-label="Navegação principal"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action buttons & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://crm.destraflow.com.br/login"
              className="hidden text-xs font-semibold text-[#a8a39b] transition-colors hover:text-white sm:inline-block px-3 py-2"
            >
              Entrar
            </a>

            <a
              href="#agendar"
              className="btn-gold !py-2 !px-3.5 !text-xs sm:!py-2.5 sm:!px-5 sm:!text-sm"
            >
              <span className="hidden sm:inline">Agendar vídeo conferência</span>
              <span className="sm:hidden">Agendar</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.12] bg-[#141618] text-[#d8d3cb] transition-colors hover:border-[#c7a06b]/40 hover:text-white md:hidden"
              aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-5 w-5 text-[#e3c79b]" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer / Overlay Navigation */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#08090a]/95 pt-20 backdrop-blur-2xl md:hidden animate-fade-in">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#8d8880]">
              Menu de Navegação
            </div>

            <nav className="flex flex-col space-y-2" aria-label="Menu móvel">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#121417]/80 px-4 py-3.5 text-base font-semibold text-[#e3c79b] hover:bg-[#181b1e] active:scale-[0.98] transition-all"
                >
                  <span className="text-white">{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-[#c7a06b]" />
                </a>
              ))}
            </nav>

            <div className="border-t border-white/[0.08] pt-6 space-y-3">
              <a
                href="https://crm.destraflow.com.br/login"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.14] bg-[#141618] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#c7a06b]/50"
              >
                <LogIn className="h-4 w-4 text-[#e3c79b]" />
                <span>Entrar no CRM</span>
              </a>

              <a
                href="#agendar"
                onClick={() => setIsOpen(false)}
                className="btn-gold w-full text-center !py-3.5 !text-sm flex items-center justify-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Agendar vídeo conferência</span>
              </a>
            </div>

            <div className="pt-2 text-center text-xs text-[#7c776f]">
              <p>Destraflow Tech · Horário de Atendimento:</p>
              <p className="text-[#a8a39b] mt-0.5">Segunda a Sexta das 14h às 20h</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
