"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { platformBrand } from "@destraflow/brand";
import { BrandMark } from "@/components/brand-mark";

const navLinks = [
  { href: "/#solucao", label: "Solução" },
  { href: "/#entregas", label: "O que fazemos" },
  { href: "/#como", label: "Como funciona" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#faq", label: "Dúvidas" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        menuButton.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="site-container flex min-h-[72px] items-center justify-between gap-3">
        <Link href="/" className="shrink-0 text-foreground" aria-label={`${platformBrand.name} — início`} onClick={() => setIsOpen(false)}>
          <BrandMark />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={platformBrand.loginUrl} className="site-button text-foreground hover:bg-primary-subtle">
            Entrar
          </a>
          <Link href="/#agendar" className="site-button site-button-primary">
            Agendar conversa
          </Link>
        </div>

        <button
          ref={menuButton}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-border-strong text-foreground md:hidden"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <nav id="site-mobile-nav" aria-label="Menu móvel" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-border bg-background px-4 pb-6 pt-3 shadow-md md:hidden">
          <div className="mx-auto flex max-w-xl flex-col gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-control px-3 py-3 text-base text-foreground hover:bg-primary-subtle" onClick={() => setIsOpen(false)}>
                {link.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-border pt-4">
              <a href={platformBrand.loginUrl} className="site-button site-button-secondary" onClick={() => setIsOpen(false)}>
                Entrar no CRM
              </a>
              <Link href="/#agendar" className="site-button site-button-primary" onClick={() => setIsOpen(false)}>
                Agendar conversa
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
