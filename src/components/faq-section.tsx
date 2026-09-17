const faqs = [
  {
    question: "A IA substitui meu time de atendimento?",
    answer:
      "Não. A IA atende primeiro, qualifica o lead e conduz até a cotação. Seu time assume a conversa quando quiser — pelo CRM ou pelo próprio celular — e devolve para a IA quando não precisar mais de atendimento humano.",
  },
  {
    question: "Funciona com o número de WhatsApp que minha agência já usa?",
    answer:
      "Sim. A conexão é feita pela API oficial do WhatsApp Business. Você pode usar o número atual da agência ou conectar um novo. Em breve será possível manter o número funcionando normalmente no app WhatsApp Business enquanto a IA atua pelo CRM.",
  },
  {
    question: "A IA pode errar um preço ou condição de pacote?",
    answer:
      "A IA trabalha com a base de conhecimento que você cadastra (pacotes, políticas, roteiros). Para informações sensíveis como preço e condições de pagamento, recomendamos que a IA encaminhe para o time humano confirmar antes de enviar a cotação final.",
  },
  {
    question: "Consigo revisar o que a IA está falando com os leads?",
    answer:
      "Sim. Todas as conversas ficam na inbox do CRM. Você pode acompanhar em tempo real, intervir a qualquer momento e definir o nível de autonomia da IA por tipo de assunto.",
  },
  {
    question: "Preciso de conta na Meta ou no WhatsApp Business?",
    answer:
      "Sim. É necessário ter uma conta na Meta e acesso ao WhatsApp Business Platform (Cloud API). A Destraflow orienta todo o processo de configuração durante a implementação.",
  },
  {
    question: "Como funciona o cancelamento e a exclusão dos meus dados?",
    answer:
      "Você pode cancelar a qualquer momento. Para excluir seus dados, basta enviar um e-mail para privacidade@destraflow.com.br com o assunto 'Exclusão de Dados'. O processo leva até 15 dias e está detalhado na página de Exclusão de Dados.",
  },
  {
    question: "A IA atende fora do horário comercial?",
    answer:
      "Sim, 24 horas por dia, 7 dias por semana. A IA responde com o tom da sua agência e qualifica o lead mesmo às 23h ou no domingo — quando o lead esfria, a venda esfria junto.",
  },
  {
    question: "Quais tipos de viagem a IA entende?",
    answer:
      "A IA é treinada para vendas de viagem: destinos, datas, grupos com crianças, pacotes internacionais, parques temáticos, cruzeiros. Ela aprende os seus produtos e políticas pela base de conhecimento que você edita direto na tela.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">Perguntas frequentes</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-border bg-card transition-shadow hover:shadow-sm open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground">
                {faq.question}
                <svg
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
