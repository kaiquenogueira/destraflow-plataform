import Image from "next/image";
import { ArrowUpRight, MessageSquareText, PanelsTopLeft, Workflow } from "lucide-react";
import { BookingFunnel } from "@/components/booking-funnel";
import { CrmPreview } from "@/components/crm-preview";
import { FaqSection } from "@/components/faq-section";

const capabilities = [
  {
    icon: MessageSquareText,
    title: "Atendimento com contexto",
    description: "Conversas, mídias e histórico ficam no Inbox. A equipe vê quando a IA respondeu e pode assumir o contato.",
  },
  {
    icon: PanelsTopLeft,
    title: "Oportunidades à vista",
    description: "O funil reúne etapas, responsáveis e próximos passos para acompanhar cada pedido de viagem.",
  },
  {
    icon: Workflow,
    title: "IA dentro do processo",
    description: "Respostas e rascunhos usam as informações configuradas para a agência, com supervisão humana.",
  },
];

const delivery = [
  { title: "Inbox", description: "Um lugar para ler conversas, revisar respostas e continuar o atendimento." },
  { title: "Funil", description: "Etapas de trabalho para acompanhar oportunidades e distribuir responsabilidades." },
  { title: "Cotações", description: "Informações da viagem organizadas para apoiar a preparação de propostas." },
  { title: "Configuração", description: "Ajustes de equipe, conhecimento e fluxos usados pela operação." },
];

const process = [
  { title: "Entender a operação", description: "Conversamos sobre o atendimento atual, os produtos e o trabalho da equipe." },
  { title: "Configurar a plataforma", description: "Organizamos o CRM, o canal e as informações que orientam os fluxos de IA." },
  { title: "Preparar a equipe", description: "Apresentamos o Inbox, o funil e as formas de revisão e intervenção humana." },
  { title: "Acompanhar o uso", description: "Ajustamos a configuração junto da agência conforme a rotina de trabalho." },
];

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SolutionSection />
      <DeliverySection />
      <ProcessSection />
      <TeamSection />
      <BookingSection />
      <FaqSection />
      <FinalSection />
      <MobileStickyBar />
    </>
  );
}

function HeroSection() {
  return (
    <section className="bg-background pb-20 pt-36 sm:pb-28 sm:pt-44">
      <div className="site-container grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="max-w-2xl">
          <span className="site-rule" aria-hidden="true" />
          <p className="mt-7 text-sm font-medium text-gold">CRM para agências que vendem Orlando</p>
          <h1 className="site-heading mt-5 text-[clamp(2.8rem,5.2vw,5rem)] text-foreground">
            Orlando exige contexto. Sua operação também.
          </h1>
          <p className="mt-7 max-w-[62ch] text-base leading-8 text-muted sm:text-lg">
            A Destraflow Tech reúne atendimento no WhatsApp, inteligência artificial,
            cotações e acompanhamento em uma plataforma feita para a rotina da agência.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#agendar" className="site-button site-button-primary">
              Agendar conversa <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#solucao" className="site-button site-button-secondary">Conhecer a solução</a>
          </div>
          <p className="mt-5 text-sm text-faint">Você escolhe um horário e fala com o time sobre a sua operação.</p>
        </div>
        <CrmPreview />
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section id="solucao" className="border-t border-border bg-surface py-20 sm:py-28">
      <div className="site-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-gold">A solução</p>
            <h2 className="site-heading mt-4 max-w-lg text-4xl text-foreground sm:text-5xl">
              O atendimento ganha continuidade.
            </h2>
          </div>
          <p className="max-w-[66ch] text-base leading-8 text-muted sm:pt-9">
            Uma venda de Orlando passa por datas, viajantes, ingressos, hospedagem e muitas
            conversas. O CRM mantém essas informações próximas de quem atende, enquanto a
            IA ajuda nas etapas configuradas para a agência.
          </p>
        </div>
        <div className="mt-14 grid gap-8 border-t border-border pt-10 md:grid-cols-3">
          {capabilities.map((item) => (
            <article key={item.title} className="max-w-sm">
              <item.icon className="h-6 w-6 text-gold" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-6 text-xl font-medium tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeliverySection() {
  return (
    <section id="entregas" data-theme="dark" className="bg-background py-20 text-foreground sm:py-28">
      <div className="site-container">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <span className="site-rule" aria-hidden="true" />
            <h2 className="site-heading mt-7 max-w-lg text-4xl sm:text-5xl">A plataforma acompanha o trabalho real.</h2>
            <p className="mt-6 max-w-md text-base leading-8 text-muted">
              As telas reúnem o que a equipe precisa para atender, preparar propostas e
              acompanhar oportunidades.
            </p>
            <a href="#agendar" className="site-button site-button-primary mt-8">Conversar sobre a implantação</a>
          </div>
          <div className="grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2">
            {delivery.map((item) => (
              <article key={item.title} className="min-h-44 bg-surface p-7">
                <h3 className="text-xl font-medium tracking-tight text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="como" className="bg-background py-20 sm:py-28">
      <div className="site-container">
        <p className="text-sm font-medium text-gold">Como funciona</p>
        <h2 className="site-heading mt-4 max-w-2xl text-4xl text-foreground sm:text-5xl">
          Da primeira conversa ao uso diário.
        </h2>
        <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((step, index) => (
            <article key={step.title} className="border-t border-border-strong pt-5">
              <span className="text-sm font-medium text-gold">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-5 text-xl font-medium tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="equipe" className="border-y border-border bg-surface-raised py-20 sm:py-28">
      <div className="site-container">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gold">Quem está por trás</p>
          <h2 className="site-heading mt-4 text-4xl text-foreground sm:text-5xl">Turismo e tecnologia na mesma conversa.</h2>
          <p className="mt-5 text-base leading-8 text-muted">
            A plataforma combina a experiência de operação de uma agência com o trabalho
            de engenharia de software e inteligência artificial.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <TeamMember
            image="/images/eduardo.png"
            name="Eduardo"
            role="Turismo e estratégia"
            alt="Eduardo, fundador da Encantrip Turismo"
            bio="Fundador da Encantrip Turismo, atua na operação de viagens para Orlando e traz essa experiência para a configuração do produto."
          />
          <TeamMember
            image="/images/kaique.png"
            name="Kaique"
            role="Tecnologia e inteligência artificial"
            alt="Kaique, responsável pela tecnologia da Destraflow Tech"
            bio="Trabalha na arquitetura do CRM, nas integrações e nos fluxos de inteligência artificial da Destraflow Tech."
          />
        </div>
      </div>
    </section>
  );
}

function TeamMember({ image, name, role, alt, bio }: { image: string; name: string; role: string; alt: string; bio: string }) {
  return (
    <figure className="grid overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="relative aspect-[4/3] min-h-52 sm:aspect-auto">
        <Image src={image} alt={alt} fill className="object-cover object-top" sizes="(max-width: 640px) 100vw, 260px" />
      </div>
      <figcaption className="flex flex-col justify-center p-6 sm:p-8">
        <h3 className="text-2xl font-medium tracking-tight text-foreground">{name}</h3>
        <p className="mt-1 text-sm font-medium text-gold">{role}</p>
        <p className="mt-5 text-sm leading-7 text-muted">{bio}</p>
      </figcaption>
    </figure>
  );
}

function BookingSection() {
  return (
    <section id="agendar" data-theme="dark" className="bg-background py-20 text-foreground sm:py-28">
      <div className="site-container">
        <div className="mb-12 max-w-2xl">
          <span className="site-rule" aria-hidden="true" />
          <h2 className="site-heading mt-7 text-4xl sm:text-5xl">Vamos conversar sobre a sua agência.</h2>
          <p className="mt-5 text-base leading-8 text-muted">
            Responda às perguntas, escolha um horário e prepare a mensagem para o time no WhatsApp.
            A reunião depende da confirmação da equipe.
          </p>
        </div>
        <BookingFunnel />
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className="border-t border-border bg-surface py-20 sm:py-24">
      <div className="site-container flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="site-rule" aria-hidden="true" />
          <h2 className="site-heading mt-6 text-4xl text-foreground sm:text-5xl">Veja como a Destraflow se encaixa na sua operação.</h2>
        </div>
        <a href="#agendar" className="site-button site-button-primary shrink-0">Agendar conversa</a>
      </div>
    </section>
  );
}

function MobileStickyBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:hidden">
      <a href="#agendar" className="site-button site-button-primary w-full">Agendar conversa</a>
    </div>
  );
}
