"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

export function MobileStickyBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledPastHero = window.scrollY > 280;
      const agendarEl = document.getElementById("agendar");

      if (!agendarEl) {
        setIsVisible(scrolledPastHero);
        return;
      }

      const rect = agendarEl.getBoundingClientRect();
      const reachedAgendar = rect.top <= window.innerHeight * 0.7;

      setIsVisible(scrolledPastHero && !reachedAgendar);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-all duration-300 ease-out sm:hidden ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <a href="#agendar" className="site-button site-button-primary w-full">
        Agendar conversa <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
