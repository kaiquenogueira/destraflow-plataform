import {
  MessageCircle,
  Clock,
  Users,
  FileSearch,
  ArrowRight,
  Phone,
  Brain,
  BarChart3,
  Shield,
  Headphones,
  Send,
  BookOpen,
  Mic,
  Megaphone,
  UserCheck,
} from "lucide-react";
import { WhatsAppMockup } from "@/components/whatsapp-mockup";
import { FaqSection } from "@/components/faq-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PainSection />
      <HowItWorksSection />
      <FeaturesSection />
      <HumanInSection />
      <ForWhomSection />
      <SecuritySection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted to-background py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div className="animate-fade-in">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            IA no WhatsApp para agências de viagem
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Todo lead de viagem{" "}
            <span className="text-primary">respondido em segundos</span>, qualificado e pronto pra cotação
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Sua agência atende 24/7 no WhatsApp com uma IA que conversa como gente, entende destino, datas, crianças e
            orçamento — e entrega o lead pronto pro seu time fechar.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#agendar-demo"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
            >
              Agendar demonstração
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://crm.destraflow.com.br/login"
              className="inline-flex items-center rounded-lg border border-border bg-white px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Entrar
            </a>
          </div>
        </div>
        <div className="animate-slide-up">
          <WhatsAppMockup />
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  const pains = [
    {
      icon: Clock,
      title: "Lead que chega às 23h e esfria",
      description:
        "O cliente manda mensagem fora do horário e, quando alguém responde no dia seguinte, já está falando com outra agência.",
    },
    {
      icon: Users,
      title: "Time preso respondendo as mesmas perguntas",
      description:
        "Seus melhores vendedores gastam horas repetindo informações sobre destino, pacote e preço em vez de fechar venda.",
    },
    {
      icon: FileSearch,
      title: "Cotação enviada sem follow-up",
      description:
        "A proposta sai, mas ninguém cobra retorno. O lead esfria, vai para o concorrente e a venda não acontece.",
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
          Sua agência perde venda por isso?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Quem vende viagem pelo WhatsApp sabe: lead que demora esfria, pergunta repetida cansa o time, e cotação sem
          follow-up não fecha.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <pain.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{pain.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pain.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: "1",
      title: "Conecte o WhatsApp da agência",
      description:
        "Use o número que sua agência já tem ou conecte um novo. A integração usa a API oficial do WhatsApp Business.",
    },
    {
      step: "2",
      title: "Ensine a IA sobre seus pacotes",
      description:
        "Cadastre destinos, roteiros, políticas e materiais (fotos, vídeos, PDFs). A IA aprende o tom da sua agência.",
    },
    {
      step: "3",
      title: "A IA atende, qualifica e entrega o lead pronto",
      description:
        "Ela responde o lead, pergunta destino, datas, quantas pessoas e orçamento. Quando o lead está qualificado, seu time assume.",
    },
  ];

  return (
    <section id="como-funciona" className="bg-muted py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">Como funciona</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Três passos para sua agência nunca mais perder um lead.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {item.step}
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const groups = [
    {
      title: "Atendimento",
      items: [
        {
          icon: MessageCircle,
          title: "IA no WhatsApp 24/7",
          description:
            "Atendente de IA pela API oficial do WhatsApp Business, respondendo com o tom da sua agência a qualquer hora.",
        },
        {
          icon: Brain,
          title: "Qualificação automática",
          description: "Destino, datas, número de viajantes e crianças, orçamento. O lead avança sozinho no funil.",
        },
        {
          icon: Mic,
          title: "Áudio em ambos os lados",
          description: "A IA entende áudio do cliente e o time pode gravar nota de voz pelo inbox.",
        },
        {
          icon: BookOpen,
          title: "Base de conhecimento editável",
          description:
            "Roteiros, pacotes, políticas, materiais (fotos, vídeos, PDFs) que a IA envia no momento certo.",
        },
      ],
    },
    {
      title: "Vendas",
      items: [
        {
          icon: Send,
          title: "Cotações e acompanhamento",
          description: "Proposta enviada, negociação, fechamento — tudo acompanhado pelo CRM.",
        },
        {
          icon: Megaphone,
          title: "Campanhas e Click-to-WhatsApp",
          description: "Leads vindos de anúncios direto no WhatsApp, com campanhas segmentadas por etapa do funil.",
        },
        {
          icon: BarChart3,
          title: "Follow-up automático",
          description:
            "Cadências por etapa do funil, respeitando a janela de 24h e os modelos aprovados pela Meta.",
        },
      ],
    },
    {
      title: "Controle",
      items: [
        {
          icon: Headphones,
          title: "Inbox do time",
          description: "Todas as conversas num lugar, com filtro por etapa e por quem está atendendo.",
        },
        {
          icon: UserCheck,
          title: "Passagem IA ↔ humano",
          description:
            "O time assume pelo CRM ou pelo celular e devolve para a IA quando quiser.",
        },
        {
          icon: Shield,
          title: "Relatórios do funil",
          description: "Veja quantos leads entraram, quantos foram qualificados e quantos viraram cotação.",
        },
      ],
    },
  ];

  return (
    <section id="recursos" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">Tudo que sua agência precisa</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Do primeiro contato ao fechamento, sem ferramenta extra.
        </p>
        {groups.map((group) => (
          <div key={group.title} className="mt-12">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{group.title}</h3>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {group.items.map((item) => (
                <div key={item.title} className="rounded-xl border border-border p-5">
                  <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h4 className="mt-3 font-semibold text-foreground">{item.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HumanInSection() {
  return (
    <section className="bg-muted py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">O humano sempre no controle</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              A IA atende e qualifica, mas a decisão é sempre sua. Seu time pode assumir qualquer conversa pelo CRM ou
              respondendo direto pelo celular — e devolver para a IA quando não precisar mais de atenção humana.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Assuma a conversa a qualquer momento, sem o cliente perceber",
                "Responda pelo CRM ou pelo próprio WhatsApp no celular",
                "Devolve para a IA quando o atendimento humano terminar",
                "Acompanhe tudo em tempo real na inbox",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Seu celular</p>
                  <p className="text-xs text-muted-foreground">Responda como sempre fez</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  O lead pergunta sobre preço do pacote → a IA avisa seu time → você responde pelo celular → devolve
                  para a IA continuar o follow-up.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForWhomSection() {
  const segments = [
    "Agências de lazer e férias",
    "Pacotes internacionais",
    "Parques temáticos (Disney, Universal)",
    "Cruzeiros",
    "Grupos e viagens familiares",
    "Destinos nacionais e internacionais",
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Para quem é a Destraflow</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Para agências de viagem pequenas e médias que vendem pelo WhatsApp e não querem mais perder lead por demora,
          fora do horário ou por falta de follow-up.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {segments.map((seg) => (
            <span
              key={seg}
              className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
            >
              {seg}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="bg-muted py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Shield className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">Segurança e privacidade</h2>
        <p className="mt-4 text-muted-foreground">
          Os dados de cada agência ficam isolados. A Destraflow usa a API oficial do WhatsApp Business e segue a LGPD.
          Não vendemos nem usamos seus dados para publicidade.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <a href="/politica-de-privacidade" className="font-medium text-primary hover:underline">
            Política de Privacidade
          </a>
          <span className="text-muted-foreground">·</span>
          <a href="/termos-de-uso" className="font-medium text-primary hover:underline">
            Termos de Uso
          </a>
          <span className="text-muted-foreground">·</span>
          <a href="/exclusao-de-dados" className="font-medium text-primary hover:underline">
            Exclusão de Dados
          </a>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section id="agendar-demo" className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
          Pronto para sua agência responder todo lead em segundos?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Agende uma demonstração e veja a Destraflow funcionando com o perfil da sua agência.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="https://wa.me/5511994188429?text=Quero%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20da%20Destraflow"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            Agendar demonstração
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="https://crm.destraflow.com.br/login"
            className="inline-flex items-center rounded-lg border border-border bg-white px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Entrar
          </a>
        </div>
      </div>
    </section>
  );
}
