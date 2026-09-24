const faqs = [
  {
    question: "A Destraflow é só uma ferramenta de CRM?",
    answer: "O CRM organiza atendimento, oportunidades e acompanhamento. A implantação também inclui a configuração da IA e dos fluxos de trabalho junto à equipe da agência.",
  },
  {
    question: "O que acontece com áudios e imagens enviados no WhatsApp?",
    answer: "A plataforma recebe mídias pelo canal conectado e pode usá-las no contexto do atendimento. A equipe acompanha a conversa no Inbox e assume quando necessário.",
  },
  {
    question: "A equipe pode assumir uma conversa?",
    answer: "Sim. O Inbox permite atendimento humano e supervisão das respostas. O modo assistido oferece rascunhos para revisão antes do envio, conforme a configuração da operação.",
  },
  {
    question: "Como as conversas são organizadas?",
    answer: "O CRM reúne conversas, responsáveis e etapas do funil. A equipe pode acompanhar o contexto de cada oportunidade e definir o próximo passo.",
  },
  {
    question: "Funciona para uma agência que vende outros destinos?",
    answer: "A especialidade da plataforma é a venda de Orlando. Na conversa inicial, avaliamos com a agência como esse fluxo se encaixa na sua operação.",
  },
  {
    question: "A integração usa a API oficial do WhatsApp?",
    answer: "O canal usa a WhatsApp Business Platform da Meta. A conexão e as regras de uso dependem da conta e das políticas aplicáveis à agência.",
  },
  {
    question: "Quanto tempo dura a conversa inicial?",
    answer: "O formulário oferece horários para uma vídeo conferência de 45 minutos, de segunda a sexta-feira, no horário de Brasília.",
  },
  {
    question: "O que acontece depois de preencher o formulário?",
    answer: "O site prepara uma mensagem no WhatsApp com os dados informados e oferece opções de calendário. O horário só fica combinado depois da confirmação pelo time da Destraflow.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border bg-background py-20 sm:py-28">
      <div className="site-container max-w-4xl">
        <span className="site-rule" aria-hidden="true" />
        <h2 className="site-heading mt-6 text-4xl text-foreground sm:text-5xl">Perguntas frequentes.</h2>
        <p className="mt-5 max-w-2xl text-base text-muted">
          O que a plataforma faz e como a equipe participa do atendimento.
        </p>
        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-card border border-border bg-surface px-5 py-4 open:border-border-strong sm:px-7">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-base font-medium text-foreground marker:hidden">
                <span>{faq.question}</span>
                <span aria-hidden="true" className="shrink-0 text-xl leading-none text-gold group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-2xl border-t border-border pt-4 text-sm leading-7 text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
