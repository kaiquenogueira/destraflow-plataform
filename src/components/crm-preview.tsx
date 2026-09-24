import { BrandMark } from "@/components/brand-mark";

const conversations = [
  { initials: "ME", name: "Marina Exemplo", subject: "Viagem para Orlando", owner: "Equipe" },
  { initials: "RE", name: "Rafael Exemplo", subject: "Dúvida sobre ingressos", owner: "IA" },
  { initials: "JE", name: "Júlia Exemplo", subject: "Cotação em revisão", owner: "Equipe" },
];

export function CrmPreview() {
  return (
    <figure className="min-w-0">
      <div
        data-theme="dark"
        role="img"
        aria-label="Prévia ilustrativa do Inbox Destraflow Tech com agência, conversas e atendimento. Todos os dados são fictícios."
        className="overflow-hidden rounded-overlay border border-border bg-background text-foreground"
      >
        <div aria-hidden="true" className="flex min-h-[360px] min-w-0">
          <div className="hidden w-40 shrink-0 border-r border-border bg-surface p-4 sm:block lg:w-44">
            <BrandMark className="text-foreground [&_span]:text-[0.77rem] [&_svg]:h-6 [&_svg]:w-6" />
            <div className="mt-7 rounded-control border border-border bg-background px-3 py-2">
              <span className="block text-[0.67rem] text-muted">Agência</span>
              <span className="block truncate text-xs font-medium text-foreground">Agência Exemplo</span>
            </div>
            <div className="mt-7 space-y-1 text-xs">
              <div className="rounded-control border-l-[3px] border-signature bg-primary-subtle px-3 py-2 text-foreground">Inbox</div>
              <div className="px-3 py-2 text-muted">Funil</div>
              <div className="px-3 py-2 text-muted">Cotações</div>
              <div className="px-3 py-2 text-muted">Relatórios</div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <div>
                <div className="text-xl font-medium tracking-tight">Inbox</div>
                <div className="mt-0.5 text-xs text-muted">Conversas da agência</div>
              </div>
              <div className="hidden rounded-control border border-border px-3 py-1.5 text-xs text-muted sm:block">Todas</div>
            </div>
            <div className="grid min-w-0 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0 border-r border-border">
                {conversations.map((conversation, index) => (
                  <div key={conversation.name} className={`flex min-w-0 items-start gap-3 border-b border-border px-4 py-4 sm:px-6 ${index === 0 ? "bg-primary-subtle" : ""}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[0.7rem] font-medium text-foreground">
                      {conversation.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">{conversation.name}</div>
                      <div className="mt-1 truncate text-xs text-muted">{conversation.subject}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.66rem] text-muted">{conversation.owner}</span>
                  </div>
                ))}
              </div>
              <div className="hidden min-w-0 p-5 md:block">
                <div className="text-xs font-semibold">Marina Exemplo</div>
                <div className="mt-1 text-[0.7rem] text-muted">Atendimento acompanhado pela equipe</div>
                <div className="mt-8 max-w-[90%] rounded-card border border-border bg-surface p-3 text-xs leading-relaxed text-foreground">
                  Olá! Gostaria de conhecer opções para uma viagem a Orlando.
                </div>
                <div className="ml-auto mt-3 max-w-[84%] rounded-card border border-border bg-primary-subtle p-3 text-xs leading-relaxed text-foreground">
                  Podemos organizar os detalhes da viagem por aqui.
                </div>
                <div className="mt-8 rounded-control border border-border bg-surface px-3 py-2 text-xs text-muted">Escreva uma mensagem…</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted">Prévia ilustrativa do CRM · dados fictícios</figcaption>
    </figure>
  );
}
