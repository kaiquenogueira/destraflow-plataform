const faqs = [
  {
    question: "O que a IA entrega para o consultor cotar?",
    answer: "A IA confirma o pedido e organiza datas, viajantes, produtos e itens dispensados em um briefing. Seu consultor usa esse resumo para consultar fornecedores, definir valores e enviar a proposta.",
  },
  {
    question: "Minha equipe consegue assumir o atendimento?",
    answer: "Sim. O consultor pode assumir a conversa no CRM e devolver o atendimento à IA depois. Com a coexistência habilitada para o número, uma resposta da equipe pelo app WhatsApp Business também pausa a IA naquela conversa.",
  },
  {
    question: "Posso testar as respostas da IA antes de ativar?",
    answer: "Sim. O simulador permite testar cenários sem enviar mensagens aos viajantes. No modo assistido, seu time pode revisar, editar e aprovar os rascunhos da IA antes do envio.",
  },
  {
    question: "Como funciona o follow-up no WhatsApp?",
    answer: "As cadências são configuradas por etapa do funil. Para retomar uma conversa fora da janela de atendimento, o WhatsApp exige um modelo de mensagem aprovado pela Meta.",
  },
  {
    question: "Posso usar o CRM se também vendo outros destinos?",
    answer: "A implantação é voltada a agências que vendem Orlando, inclusive as que trabalham com outros destinos. Na demonstração, avaliamos quais produtos e etapas do seu atendimento fazem sentido levar para o CRM.",
  },
  {
    question: "Como confirmo a demonstração?",
    answer: "Escolha um horário no formulário e envie a mensagem preparada no WhatsApp. Nossa equipe confirma o horário e envia o link da videochamada. A demonstração dura 45 minutos e é gratuita.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border bg-background py-16 text-foreground sm:py-24">
      <div className="site-container grid gap-7 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-16">
        <div>
          <h2 className="landing-heading">Perguntas frequentes</h2>
        </div>
        <div className="border-t border-border">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="group border-b border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-base font-semibold transition-colors hover:text-gold">
                {question}
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-lg font-normal text-gold transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pb-5 text-base leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
