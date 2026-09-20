import Image from "next/image";
import { Check, Phone, Laptop } from "lucide-react";
import { BookingFunnel } from "@/components/booking-funnel";
import { FaqSection } from "@/components/faq-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CredibilityBar />
      <ProblemaSection />
      <SolucaoSection />
      <EntregasSection />
      <ComoFuncionaSection />
      <HumanoNoControleSection />
      <EquipeSection />
      <AgendarSection />
      <FaqSection />
      <CtaFinalSection />
      <MobileStickyBar />
    </>
  );
}

/* =====================================================================
   HERO SECTION
   ===================================================================== */
function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-32 bg-[#08090a]">
      {/* Background ambient radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 h-[640px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(199,160,107,0.18)_0%,rgba(199,160,107,0.03)_50%,transparent_75%)] blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="animate-fade-in space-y-6">
            <div className="kicker">
              Tecnologia para agências de viagens
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[66px] lg:leading-[1.03]">
              Mais tecnologia para <span className="gold-gradient-text">vender mais Orlando.</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-[#d8d3cb]">
              Implantamos um CRM especialista em Orlando com inteligência artificial integrada: atendimento automatizado no WhatsApp, cotações mais rápidas e uma operação que para de depender de esforço manual.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a href="#agendar" className="btn-gold text-sm sm:text-base">
                Agendar vídeo conferência →
              </a>
              <a href="#solucao" className="btn-ghost text-sm sm:text-base">
                Ver como funciona
              </a>
            </div>

            <div className="flex items-center gap-2.5 pt-2 text-xs sm:text-sm text-[#8d8880]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ade80]" />
              </span>
              <span>Conversas de 45 minutos, das 14h às 20h — escolha seu horário no formulário.</span>
            </div>
          </div>

          <div className="relative animate-slide-up">
            {/* Soft decorative glow container */}
            <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-tr from-[#c7a06b]/20 to-transparent blur-xl -z-10" />

            <figure className="overflow-hidden rounded-3xl border border-white/[0.12] bg-[#121417] shadow-2xl">
              <div className="relative aspect-[4/4.5] w-full overflow-hidden">
                <Image
                  src="/images/hero.png"
                  alt="Eduardo e Kaique da Destraflow Tech em Orlando"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 500px"
                />
              </div>
              <figcaption className="flex items-center justify-between border-t border-[#c7a06b]/25 bg-gradient-to-b from-[#0e1012] to-[#08090a] px-5 py-3.5">
                <div>
                  <b className="block text-sm font-bold text-white">Eduardo</b>
                  <span className="text-xs text-[#8d8880]">Turismo · Estratégia</span>
                </div>
                <div className="text-right">
                  <b className="block text-sm font-bold text-white">Kaique</b>
                  <span className="text-xs text-[#8d8880]">Tecnologia · IA</span>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   CREDIBILITY BAR
   ===================================================================== */
function CredibilityBar() {
  const metrics = [
    { value: "+1.000", label: "clientes atendidos" },
    { value: "15 anos", label: "de mercado e operação" },
    { value: "Orlando", label: "especialização real" },
    { value: "IA + CRM", label: "integrados ao processo" },
  ];

  return (
    <div className="border-y border-white/[0.08] bg-[#0b0c0e] py-7">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
          {metrics.map((item) => (
            <div key={item.label} className="space-y-1">
              <strong className="block text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {item.value}
              </strong>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#8d8880]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   PROBLEMA SECTION (Warm Cream / Off-White Contrast)
   ===================================================================== */
function ProblemaSection() {
  const pains = [
    {
      symbol: "◌",
      title: "Atendimento que não para",
      description: "WhatsApp lotado, mesmas perguntas todo dia sobre parques e ingressos, e respostas que dependem de alguém estar livre.",
    },
    {
      symbol: "▤",
      title: "Cotação demorada",
      description: "Informação espalhada em planilha, print e conversas antigas. Cada nova oportunidade para cotação de Orlando custa horas preciosas.",
    },
    {
      symbol: "⚙",
      title: "Follow-up que se perde",
      description: "Lead que esfria, orçamento enviado sem retorno ativo e reserva sem acompanhamento contínuo — sem o time perceber a perda.",
    },
  ];

  return (
    <section id="problema" className="bg-[#f6f1e8] py-20 sm:py-28 text-[#16181b]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <div className="kicker-cream">O desafio das agências hoje</div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-[#14100b]">
            Muito trabalho para dar conta de tudo?
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-[#5d5952]">
            Vender Orlando exige detalhe: parque, ingresso, hotel, transfer, seguro e roteiro. O problema começa quando a operação consome o tempo que deveria estar sendo usado exclusivamente para vender.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((p) => (
            <article
              key={p.title}
              className="rounded-3xl border border-black/[0.08] bg-white/70 p-7 shadow-sm transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111315] text-[#e3c79b] text-xl font-extrabold mb-5 border border-[#c7a06b]/30">
                {p.symbol}
              </div>
              <h3 className="text-lg font-bold text-[#14100b] mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed text-[#5d5952]">{p.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <a href="#agendar" className="btn-gold">
            Quero resolver isso na minha agência →
          </a>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   SOLUÇÃO SECTION
   ===================================================================== */
function SolucaoSection() {
  const checks = [
    {
      title: "Atendimento automático e inteligente",
      desc: "A IA responde no WhatsApp 24/7, qualifica datas, grupo e orçamento, entregando o lead pronto para o vendedor fechar.",
    },
    {
      title: "Cotações rápidas e personalizadas",
      desc: "Menos digitação repetitiva, mais proposta estruturada na mão do passageiro no mesmo dia.",
    },
    {
      title: "Organização e acompanhamento de clientes",
      desc: "Cada lead com etapa, consultor responsável e próximo passo de contato visíveis no funil.",
    },
    {
      title: "Integração com parques, hotéis, transfer e seguro",
      desc: "O CRM entende o produto que você vende — não é um software genérico adaptado às pressas.",
    },
  ];

  return (
    <section id="solucao" className="bg-[#08090a] py-20 sm:py-28 border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="space-y-6">
            <div className="kicker">A solução Destraflow</div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Inteligência artificial a favor <span className="gold-gradient-text">da sua agência.</span>
            </h2>
            <p className="text-base text-[#a8a39b] leading-relaxed">
              Automatizamos processos, organizamos informação e deixamos sua equipe focada no que realmente importa: vender e encantar clientes com viagens inesquecíveis.
            </p>

            <div className="space-y-4 pt-2">
              {checks.map((item) => (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111315] text-[#e3c79b] border border-[#c7a06b]/40 text-xs mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="block text-sm font-bold text-white mb-0.5">{item.title}</strong>
                    <span className="text-xs sm:text-sm text-[#a8a39b] leading-relaxed">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <a href="#agendar" className="btn-gold">
                Quero entender a solução →
              </a>
            </div>
          </div>

          <div className="relative">
            <figure className="overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121417] shadow-2xl">
              <div className="relative aspect-[9/14] w-full overflow-hidden">
                <Image
                  src="/images/solucao.jpg"
                  alt="Atendimento da IA da Destraflow no WhatsApp para agências de Orlando"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
              <figcaption className="p-3 text-center text-xs tracking-wider uppercase text-[#7c776f] bg-[#0c0d0f] border-t border-white/[0.06]">
                Atendimento da IA no WhatsApp · imagem ilustrativa
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   ENTREGAS SECTION (Cream Light Contrast)
   ===================================================================== */
function EntregasSection() {
  const deliveries = [
    {
      ico: "◈",
      title: "Briefing de cotação em 2 minutos",
      desc: "A IA extrai datas, parques Disney e Universal, idades exatas das crianças (regras de gratuidade), hotel e carro. O consultor só copia e emite na operadora parceira.",
    },
    {
      ico: "✦",
      title: "Fila inteligente por prioridade",
      desc: "Classificação em 4 eixos (viagens urgentes ≤ 7 dias, clientes comparadores com cotação na mão e leads premium no topo da fila para bater a concorrência).",
    },
    {
      ico: "⌁",
      title: "O 'Eco' no WhatsApp (Híbrido Real)",
      desc: "Seu consultor pode responder pelo aplicativo comum do WhatsApp no celular. O CRM detecta, assume o atendimento e pausa a IA instantaneamente.",
    },
    {
      ico: "▦",
      title: "Debounce de rajadas, áudios e prints",
      desc: "A IA aguarda o cliente terminar de falar (~12s), transcreve múltiplos áudios, lê prints de orçamentos concorrentes e responde em um único turno coeso.",
    },
    {
      ico: "◧",
      title: "Cadências automáticas de follow-up",
      desc: "Retomadas inteligentes e não invasivas (+2h, +1d, +3d, +7d...) para orçamentos enviados, reativando leads frios antes que comprem em outra agência.",
    },
    {
      ico: "⟐",
      title: "Escalonamento ativo no WhatsApp",
      desc: "Alertas automáticos no WhatsApp do consultor quando o cliente pede link de pagamento, tem dúvidas fora da base ou está pronto para fechar.",
    },
  ];

  return (
    <section id="entregas" className="bg-[#f6f1e8] py-20 sm:py-28 text-[#16181b] border-y border-black/[0.06]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <div className="kicker-cream">O que entra na implantação</div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-[#14100b]">
            Não é só uma ferramenta. <span className="text-[#9a7549]">É a operação montada.</span>
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-[#5d5952]">
            A Destraflow apoia a implantação ponta a ponta: configuramos, treinamos a IA com as regras da sua agência e acompanhamos os resultados.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deliveries.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-black/[0.08] bg-white/70 p-7 shadow-sm transition-transform hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111315] text-[#e3c79b] text-xl font-extrabold mb-5 border border-[#c7a06b]/30">
                {item.ico}
              </div>
              <h3 className="text-lg font-bold text-[#14100b] mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[#5d5952]">{item.desc}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <a href="#agendar" className="btn-gold">
            Agendar uma conversa sobre a implantação →
          </a>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   COMO FUNCIONA SECTION
   ===================================================================== */
function ComoFuncionaSection() {
  const steps = [
    {
      num: "1",
      title: "Entendemos sua realidade",
      desc: "Mapeamos os processos atuais, gargalos e o jeito que a sua agência atende e vende hoje.",
    },
    {
      num: "2",
      title: "Implantamos a solução",
      desc: "CRM especialista, automações, IA treinada e integrações configuradas para a sua operação.",
    },
    {
      num: "3",
      title: "Treinamos sua equipe",
      desc: "Seu time aprende o fluxo e se torna apto a operar a ferramenta e converter muito mais.",
    },
    {
      num: "4",
      title: "Acompanhamos os resultados",
      desc: "Ajuste contínuo das abordagens e métricas com base no que os dados de vendas mostram.",
    },
  ];

  return (
    <section id="como" className="bg-[#0f1113] py-20 sm:py-28 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <figure className="overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121417] shadow-2xl">
              <div className="relative aspect-[16/13.5] w-full overflow-hidden">
                <Image
                  src="/images/comofunciona.jpg"
                  alt="Painel do CRM Destraflow com métricas de agências de Orlando"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 520px"
                />
              </div>
              <figcaption className="p-3 text-center text-xs tracking-wider uppercase text-[#7c776f] bg-[#0c0d0f] border-t border-white/[0.06]">
                Painel do CRM · imagem ilustrativa
              </figcaption>
            </figure>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div className="kicker">Como funciona</div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Tecnologia na prática, <span className="gold-gradient-text">do seu lado.</span>
            </h2>
            <p className="text-base text-[#a8a39b] leading-relaxed">
              Quatro etapas claras, do diagnóstico inicial ao acompanhamento contínuo — com a nossa equipe junto em todas elas.
            </p>

            <div className="space-y-4 pt-2">
              {steps.map((s) => (
                <div key={s.num} className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-[#141618] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1c1f24] text-[#e3c79b] font-extrabold text-base border border-[#c7a06b]/30">
                    {s.num}
                  </div>
                  <div>
                    <strong className="block text-sm sm:text-base font-bold text-white mb-0.5">{s.title}</strong>
                    <span className="text-xs sm:text-sm text-[#a8a39b] leading-relaxed">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <a href="#agendar" className="btn-gold">
                Começar pelo diagnóstico →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   HUMANO NO CONTROLE & META API (Technical Security & Hybrid Operation)
   ===================================================================== */
function HumanoNoControleSection() {
  return (
    <section className="bg-[#08090a] py-20 sm:py-24 border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-5">
            <div className="kicker">Segurança & Autonomia</div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              O atendente humano <span className="gold-gradient-text">sempre no comando.</span>
            </h2>
            <p className="text-base text-[#a8a39b] leading-relaxed">
              A IA não é uma caixa preta incontrolável. Ela atende no primeiro segundo, qualifica o passageiro e entrega a cotação pronta. A qualquer momento, seu vendedor assume o contato pelo computador ou diretamente pelo celular, com ferramentas de proteção ativa.
            </p>
            <ul className="space-y-3 text-sm text-[#d8d3cb] pt-2">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#e3c79b] shrink-0" />
                <span>Mecanismo de Eco: responda pelo app do WhatsApp no celular e a IA pausa na hora</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#e3c79b] shrink-0" />
                <span>Shadow Mode: aprove rascunhos da IA em 1 clique antes do envio aos clientes</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#e3c79b] shrink-0" />
                <span>Escalonamento: alertas no WhatsApp do vendedor quando o cliente pede link de pagamento</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#e3c79b] shrink-0" />
                <span>Conexão oficial Meta Cloud API: isolamento de dados, LGPD e zero risco de banimento</span>
              </li>
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/[0.08] bg-[#121417] p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c7a06b]/10 text-[#e3c79b] border border-[#c7a06b]/20">
                <Phone className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Mecanismo de Eco</h3>
              <p className="text-xs sm:text-sm text-[#a8a39b] leading-relaxed">
                Seu consultor responde pelo próprio celular no WhatsApp tradicional. O CRM detecta a fala humana e pausa a IA na mesma transação.
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-[#121417] p-6 space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c7a06b]/10 text-[#e3c79b] border border-[#c7a06b]/20">
                <Laptop className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Shadow Mode & Inbox</h3>
              <p className="text-xs sm:text-sm text-[#a8a39b] leading-relaxed">
                Opção de operar com rascunhos assistidos: a IA gera a resposta perfeita e seu time só aprova ou edita em um toque.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   EQUIPE / QUEM SOMOS SECTION
   ===================================================================== */
function EquipeSection() {
  return (
    <section id="equipe" className="bg-[#0b0c0e] py-20 sm:py-28 border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <div className="kicker">Quem está por trás</div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Turismo e tecnologia na <span className="gold-gradient-text">mesma direção.</span>
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-[#a8a39b]">
            A união de quem vive a operação diária de uma agência de Orlando com quem constrói arquitetura de software e inteligência artificial de ponta.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {/* Eduardo */}
          <figure className="overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121417] shadow-xl">
            <div className="relative aspect-[4/4.8] w-full overflow-hidden bg-[#16181b]">
              <Image
                src="/images/eduardo.png"
                alt="Eduardo, fundador da Encantrip Turismo"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 450px"
              />
            </div>
            <figcaption className="p-6 sm:p-7 space-y-3">
              <div>
                <h3 className="text-2xl font-extrabold text-white">Eduardo</h3>
                <p className="text-xs uppercase font-bold tracking-wider text-[#e3c79b]">
                  Turismo • Estratégia • Orlando
                </p>
              </div>
              <p className="text-sm text-[#a8a39b] leading-relaxed">
                Mais de 15 anos de mercado, hoje 100% dedicado ao turismo. Fundador da Encantrip Turismo, agência especializada em Orlando associada à Visit Orlando e com selo Cadastur, com mais de 1.000 clientes atendidos. O EncantripCRM foi forjado e validado na prática em mais de 5.400 linhas de diálogos reais de atendimento e vendas de parques.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {["Fundador Encantrip", "+1.000 clientes", "Visit Orlando & Cadastur", "Validação em Produção"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[#c7a06b]/30 bg-[#c7a06b]/10 px-3 py-1 text-xs font-semibold text-[#e3c79b]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </figcaption>
          </figure>

          {/* Kaique */}
          <figure className="overflow-hidden rounded-3xl border border-white/[0.1] bg-[#121417] shadow-xl">
            <div className="relative aspect-[4/4.8] w-full overflow-hidden bg-[#16181b]">
              <Image
                src="/images/kaique.png"
                alt="Kaique, Tech Lead e AI Engineer da Destraflow Tech"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 450px"
              />
            </div>
            <figcaption className="p-6 sm:p-7 space-y-3">
              <div>
                <h3 className="text-2xl font-extrabold text-white">Kaique</h3>
                <p className="text-xs uppercase font-bold tracking-wider text-[#e3c79b]">
                  Tecnologia • Automação • Inteligência Artificial
                </p>
              </div>
              <p className="text-sm text-[#a8a39b] leading-relaxed">
                Tech Lead e AI Engineer, com sólida experiência em engenharia de software e inteligência artificial aplicada. Constrói as integrações, as automações e a arquitetura que sustentam a operação — tecnologia feita para resolver problemas reais de conversão de leads.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {["Tech Lead | AI Engineer", "Integrações & API", "Inteligência Artificial", "Arquitetura de Soluções"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[#c7a06b]/30 bg-[#c7a06b]/10 px-3 py-1 text-xs font-semibold text-[#e3c79b]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </figcaption>
          </figure>
        </div>

        <div className="mt-10">
          <a href="#agendar" className="btn-gold">
            Falar com a gente por vídeo →
          </a>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   AGENDAR SECTION (Funil Interativo de Conversão)
   ===================================================================== */
function AgendarSection() {
  return (
    <section id="agendar" className="bg-[#08090a] py-20 sm:py-28 border-t border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <BookingFunnel />
      </div>
    </section>
  );
}

/* =====================================================================
   CTA FINAL SECTION (Warm Off-White Gradient)
   ===================================================================== */
function CtaFinalSection() {
  return (
    <section className="bg-gradient-to-br from-[#f7f2e9] via-[#f1e7d6] to-[#e8dcc8] py-20 sm:py-28 text-[#14100b]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="kicker-cream">Próximo passo</div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-[#14100b]">
              Sua agência pode ter mais fluxo, mais tecnologia e menos complexidade.
            </h2>
            <p className="text-base sm:text-lg text-[#5d5952]">
              Escolha um horário entre 14h e 20h e vamos conversar por vídeo conferência.
            </p>
          </div>
          <div>
            <a href="#agendar" className="btn-gold text-base !py-4 !px-8">
              Agendar vídeo conferência →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   MOBILE STICKY BAR
   ===================================================================== */
function MobileStickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.1] bg-[#08090a]/90 p-3.5 backdrop-blur-lg sm:hidden">
      <a href="#agendar" className="btn-gold w-full text-center !py-3 !text-sm">
        Agendar vídeo conferência →
      </a>
    </div>
  );
}
