interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background pb-20 pt-36">
      <article className="site-container max-w-4xl rounded-card border border-border bg-surface px-6 py-10 sm:px-12 sm:py-14">
        <span className="site-rule" aria-hidden="true" />
        <h1 className="site-heading mt-6 text-4xl text-foreground sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-muted">Última atualização: {lastUpdated}</p>
        <div className="mt-12 space-y-6 text-base leading-7 text-muted">{children}</div>
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
