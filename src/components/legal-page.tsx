interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="bg-[#08090a] min-h-screen pt-28 pb-24 text-[#d8d3cb]">
      <article className="mx-auto max-w-3xl rounded-3xl border border-white/[0.08] bg-[#121417] p-6 sm:p-12 shadow-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-[#a8a39b]">
          Última atualização: {lastUpdated}
        </p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-[#c9c5be]">
          {children}
        </div>
      </article>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-bold tracking-tight text-white border-b border-white/[0.08] pb-2">{children}</h2>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-[#e3c79b]">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[#a8a39b] leading-relaxed">{children}</p>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 text-[#a8a39b] pl-2">
      {children}
    </ul>
  );
}
