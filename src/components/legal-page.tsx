interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background pb-14 pt-24 sm:pb-20 sm:pt-36">
      <article className="site-container max-w-4xl rounded-card border border-border bg-surface px-4 py-7 sm:px-12 sm:py-14">
        <span className="site-rule" aria-hidden="true" />
        <h1 className="site-heading mt-5 text-2xl text-foreground sm:mt-6 sm:text-4xl lg:text-5xl">{title}</h1>
        <p className="mt-3 text-xs text-muted sm:mt-4 sm:text-sm">Última atualização: {lastUpdated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted sm:mt-12 sm:text-base sm:leading-7">{children}</div>
      </article>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 border-b border-border pb-3 text-xl font-semibold text-foreground">{children}</h2>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-7 text-base font-semibold text-gold">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-7 text-muted">{children}</p>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6 leading-7 text-muted">{children}</ul>;
}
