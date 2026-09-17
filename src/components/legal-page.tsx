interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: {lastUpdated}</p>
      <div className="prose-custom mt-8 space-y-6 text-sm leading-relaxed text-foreground">{children}</div>
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground">{children}</h2>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
      {children}
    </ul>
  );
}
