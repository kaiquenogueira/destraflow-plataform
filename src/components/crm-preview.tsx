"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { ClipboardList, Columns3, MessageCircle, Maximize2 } from "lucide-react";

const screens = [
  {
    id: "atendimento",
    label: "Atendimento",
    icon: MessageCircle,
    title: "Qualifique o pedido na própria conversa.",
    description: "A IA usa o playbook da agência para responder dúvidas e coletar o que falta. Seu time acompanha as mensagens e a ficha do viajante no mesmo lugar.",
    details: ["Histórico da conversa e ficha do viajante", "Transcrição de áudios e leitura de imagens recebidas"],
    alt: "Inbox do CRM com conversas à esquerda, chat do WhatsApp ao centro e ficha comercial do viajante à direita.",
  },
  {
    id: "cotacoes",
    label: "Cotações",
    icon: ClipboardList,
    title: "Comece a cotação com o pedido em mãos.",
    description: "A IA reúne datas, viajantes, produtos e itens que o cliente dispensou. Seu consultor recebe o briefing na fila por prioridade, monta a proposta e registra o envio.",
    details: ["Fila de briefings com prioridade", "Histórico de cotações enviadas e canceladas"],
    alt: "Fila de cotações do CRM com abas de pendentes, enviadas e canceladas e pedidos com datas, viajantes e produtos.",
  },
  {
    id: "funil",
    label: "Funil",
    icon: Columns3,
    title: "Veja qual oportunidade precisa de atenção.",
    description: "Acompanhe o estágio, a última atividade e o próximo passo sugerido. Configure cadências de follow-up por etapa para retomar conversas conforme as regras do canal.",
    details: ["Funil em quadro ou lista, com filtros", "Follow-up configurável por etapa"],
    alt: "Funil do CRM em lista, com filtros, prioridade e próximos passos sugeridos para cada negociação.",
  },
];

export function CrmPreview() {
  const id = useId();
  const [selected, setSelected] = useState(1);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const navigation: Partial<Record<string, number>> = {
      ArrowLeft: (index + screens.length - 1) % screens.length,
      ArrowRight: (index + 1) % screens.length,
      Home: 0,
      End: screens.length - 1,
    };
    const nextIndex = navigation[event.key];

    if (nextIndex === undefined) return;

    event.preventDefault();
    setSelected(nextIndex);
    tabs.current[nextIndex]?.focus();
  }

  return (
    <section id="solucao" className="border-t border-border bg-surface-raised py-16 text-foreground sm:py-24" aria-labelledby={`${id}-title`}>
      <div className="site-container">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div id="problema" className="max-w-3xl scroll-mt-24">
            <p className="landing-eyebrow text-gold">O CRM por dentro</p>
            <h2 id={`${id}-title`} className="landing-heading mt-3">Do primeiro contato à proposta enviada.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Explore as telas que conectam atendimento, cotação e acompanhamento comercial.
            </p>
          </div>
          <div role="tablist" aria-labelledby={`${id}-title`} className="grid w-full max-w-md grid-cols-3 gap-1 rounded-card border border-border bg-background p-1.5 lg:w-[26rem]">
            {screens.map(({ id: screenId, icon: Icon, label }, index) => (
              <button
                key={screenId}
                ref={(button) => { tabs.current[index] = button; }}
                id={`${id}-tab-${screenId}`}
                type="button"
                role="tab"
                aria-selected={selected === index}
                aria-controls={`${id}-panel-${screenId}`}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-1 text-sm font-semibold text-muted transition-colors hover:bg-primary-subtle aria-selected:bg-primary aria-selected:text-primary-foreground sm:px-3"
              >
                <Icon className="hidden size-4 sm:block" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {screens.map(({ id: screenId, label, title, description, details, alt }, index) => {
          const src = `/images/crm/${screenId}.webp`;

          return (
            <div
              key={screenId}
              role="tabpanel"
              id={`${id}-panel-${screenId}`}
              aria-labelledby={`${id}-tab-${screenId}`}
              tabIndex={0}
              hidden={selected !== index}
              className="mt-4 rounded-overlay border border-border bg-surface p-4 sm:mt-5 sm:p-6 lg:p-7"
            >
              <div className="grid items-center gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
                <div className="py-1 lg:py-4 lg:pl-3">
                  <h3 className="max-w-sm text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{title}</h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-muted">{description}</p>
                  <ul className="mt-5 space-y-2.5 text-sm font-medium text-foreground">
                    {details.map((detail) => (
                      <li key={detail} className="flex gap-2.5">
                        <span className="mt-[0.52em] size-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <figure className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">
                  {selected === index && <Image src={src} alt={alt} width={1584} height={1100} sizes="(max-width: 1023px) 95vw, 740px" className="h-auto w-full" />}
                  <figcaption className="flex flex-wrap items-center justify-between gap-x-3 border-t border-border bg-background px-3 py-1.5 sm:px-4">
                    <span className="text-xs text-muted sm:text-sm">Tela real · dados de demonstração</span>
                    <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar captura de ${label} em nova aba`} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-gold underline-offset-4 hover:underline">
                      <Maximize2 className="size-3.5" aria-hidden="true" />
                      Ampliar captura
                    </a>
                  </figcaption>
                </figure>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
