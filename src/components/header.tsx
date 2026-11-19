"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { platformBrand } from "@destraflow/brand";
import { BrandMark } from "@/components/brand-mark";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/#solucao", label: "O CRM" },
  { href: "/#entregas", label: "Recursos" },
  { href: "/#como", label: "Implantação" },
  { href: "/#faq", label: "Dúvidas" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const desktop = window.matchMedia("(min-width: 64rem)");

    function closeOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      toggle.current?.focus();
    }

    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="site-container flex min-h-[4.5rem] items-center justify-between gap-2 sm:gap-6">
        <Link href="/" onClick={() => setIsOpen(false)} className="flex min-h-11 items-center text-foreground" aria-label={`${platformBrand.name} — início`}>
          <BrandMark className="max-sm:gap-1.5 max-sm:[&_span]:text-sm max-sm:[&_svg]:size-6" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted lg:flex" aria-label="Navegação principal">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center transition-colors hover:text-foreground">{label}</Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <a href={platformBrand.loginUrl} className="hidden min-h-11 items-center text-sm font-semibold text-muted hover:text-foreground lg:inline-flex">
            Entrar no CRM
          </a>
          <Link href="/#agendar" onClick={() => setIsOpen(false)} className="site-button site-button-primary px-2! py-2! text-xs! sm:px-5! sm:text-sm!">
            <span className="min-[360px]:hidden">Agendar</span>
            <span className="hidden min-[360px]:inline sm:hidden">Agendar demo</span>
            <span className="hidden sm:inline">Agendar demonstração</span>
          </Link>
          <button
            ref={toggle}
            type="button"
            className="flex size-11 cursor-pointer items-center justify-center rounded-control border border-border-strong text-foreground hover:bg-primary-subtle lg:hidden"
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            aria-controls="mobile-navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav id="mobile-navigation" aria-label="Navegação móvel" hidden={!isOpen} className="border-t border-border bg-background px-4 py-3 sm:px-8 lg:hidden">
        {links.map(({ href, label }) => (
          <Link key={href} href={href} onClick={() => setIsOpen(false)} className="flex min-h-11 items-center rounded-control px-2 font-medium text-foreground hover:bg-primary-subtle">
            {label}
          </Link>
        ))}
        <a href={platformBrand.loginUrl} className="flex min-h-11 items-center rounded-control px-2 font-medium text-gold hover:bg-primary-subtle">
          Entrar no CRM
        </a>
      </nav>
    </header>
  );
}
