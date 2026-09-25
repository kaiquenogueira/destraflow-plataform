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
        <div aria-hidden="true" className="flex min-h-0 min-w-0 sm:min-h-[360px]">
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
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-4">
              <div>
                <div className="text-lg font-medium tracking-tight sm:text-xl">Inbox</div>
                <div className="mt-0.5 text-[0.72rem] text-muted sm:text-xs">Conversas da agência</div>
              </div>
              <div className="rounded-control border border-border px-2.5 py-1 text-[0.72rem] text-muted sm:px-3 sm:py-1.5 sm:text-xs">Todas</div>
            </div>
            <div className="grid min-w-0 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <div className="min-w-0 md:border-r border-border">
                {conversations.map((conversation, index) => (
                  <div
                    key={conversation.name}
                    className={`flex min-w-0 items-start gap-3 border-b border-border px-3.5 py-3 sm:px-6 sm:py-4 ${
                      index === 0 ? "bg-primary-subtle" : ""
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[0.68rem] font-medium text-foreground sm:h-9 sm:w-9 sm:text-[0.7rem]">
                      {conversation.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-foreground">{conversation.name}</div>
                      <div className="mt-0.5 truncate text-[0.72rem] text-muted sm:text-xs">{conversation.subject}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.64rem] text-muted sm:text-[0.66rem]">{conversation.owner}</span>
                  </div>
                ))}
              </div>
              <div className="block min-w-0 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Marina Exemplo</div>
                    <div className="mt-0.5 text-[0.68rem] text-muted">Atendimento acompanhado pela equipe</div>
                  </div>
                  <span className="text-[0.65rem] font-medium text-gold">Ativo</span>
                </div>
                <div className="mt-4 sm:mt-6 max-w-[92%] rounded-card border border-border bg-surface p-2.5 sm:p-3 text-xs leading-relaxed text-foreground">
                  Olá! Gostaria de conhecer opções para uma viagem a Orlando.
                </div>
                <div className="ml-auto mt-2.5 max-w-[88%] rounded-card border border-border bg-primary-subtle p-2.5 sm:p-3 text-xs leading-relaxed text-foreground">
                  Podemos organizar os detalhes da viagem por aqui.
                </div>
                <div className="mt-4 sm:mt-6 rounded-control border border-border bg-surface px-3 py-2 text-xs text-muted">
                  Escreva uma mensagem…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 text-center text-xs text-muted sm:text-left">Prévia ilustrativa do CRM · dados fictícios</figcaption>
    </figure>
  );
}
