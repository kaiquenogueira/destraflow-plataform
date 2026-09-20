export function FaqSection() {
  const faqs = [
    {
      question: "A Destraflow é só uma ferramenta de CRM?",
      answer:
        "Não. O CRM é a peça central, mas a entrega é a operação completa montada: automação de cotações, inteligência artificial treinada com os produtos e políticas da sua agência, integrações com WhatsApp oficial da Meta e acompanhamento contínuo dos resultados.",
    },
    {
      question: "E se o cliente mandar múltiplos áudios ou prints de orçamentos concorrentes?",
      answer:
        "Nosso motor de IA possui tecnologia de agrupamento de rajadas (debounce de ~12s). Se o cliente mandar 3 áudios seguidos e 2 prints, a IA aguarda ele terminar de falar, transcreve os áudios, lê os prints de cotações da concorrência e responde tudo em um único turno coeso e elegante, sem atropelar a conversa.",
    },
    {
      question: "Meu vendedor precisa ficar na frente do computador o dia todo?",
      answer:
        "Não! Desenvolvemos o mecanismo de 'Eco no WhatsApp': o consultor pode responder o cliente diretamente pelo aplicativo normal do WhatsApp no próprio celular. O CRM reconhece que o atendimento foi assumido pelo humano, registra na linha do tempo e pausa a IA instantaneamente. Além disso, o time recebe alertas automáticos no WhatsApp pessoal sempre que um lead pede link de pagamento ou precisa de fechamento.",
    },
    {
      question: "Como a IA sabe quem atender primeiro em dias com muitos leads?",
      answer:
        "O CRM classifica automaticamente cada conversa em 4 eixos estratégicos: viagens urgentes (embarque em ≤ 7 dias), clientes comparadores (que já têm cotação e querem fechar rápido), leads premium (resorts e ingressos VIP) e canal de origem. A fila de atendimento coloca os leads mais quentes no topo para sua agência bater a concorrência.",
    },
    {
      question: "Consigo revisar o que a IA vai responder antes de enviar?",
      answer:
        "Sim. A plataforma conta com o Shadow Mode (Modo Assistido). Se desejar, durante os primeiros dias de uso a IA gera os rascunhos das respostas e seu time pode aprovar ou editar em 1 clique antes do envio, garantindo total tranquilidade e alinhamento com o estilo da sua agência.",
    },
    {
      question: "Funciona para agências que não são 100% especializadas em Orlando?",
      answer:
        "Nosso posicionamento e arquitetura foram desenhados especificamente para Orlando (ingressos, parques Disney e Universal, hotéis, transfers e roteiros), onde a margem é alta e a complexidade de atendimento é grande. Se sua agência vende Orlando com frequência, mesmo operando outros destinos, a solução se encaixa perfeitamente.",
    },
    {
      question: "A integração usa a API oficial do WhatsApp?",
      answer:
        "Sim. Utilizamos a WhatsApp Business Platform (Cloud API oficial da Meta). Isso garante estabilidade máxima, segurança jurídica, conformidade com a LGPD e sem nenhum risco de banimento de número por automações clandestinas.",
    },
    {
      question: "Quanto tempo dura a reunião e qual o investimento?",
      answer:
        "A reunião dura 45 minutos, realizada por vídeo chamada, de segunda a sexta-feira entre 14h e 20h (horário de Brasília). É um diagnóstico prático da sua operação, sem custo e sem compromisso de contratação.",
    },
    {
      question: "O que acontece depois que eu preencho o agendamento?",
      answer:
        "Ao finalizar, você recebe a opção de baixar o convite de calendário (.ics / Google Agenda) e o WhatsApp é aberto com todas as informações preenchidas. Nosso time confirma a reunião e envia o link direto da vídeo conferência.",
    },
  ];

  return (
    <section id="faq" className="border-t border-white/[0.08] bg-[#08090a] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <div className="kicker">Dúvidas Frequentes</div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Tudo o que você precisa saber <span className="gold-gradient-text">antes de agendar</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#a8a39b] max-w-2xl mx-auto">
            Transparência total sobre como a tecnologia opera e como a implantação acontece na sua agência.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-white/[0.08] bg-[#121417]/70 p-5 transition-all hover:border-[#c7a06b]/40 open:border-[#c7a06b]/40 open:bg-[#121417]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white text-base sm:text-lg">
                <span>{faq.question}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-sm text-[#e3c79b] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-[#a8a39b] border-t border-white/[0.06] pt-3">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
