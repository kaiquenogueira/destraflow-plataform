import Image from "next/image";
import { ArrowUpRight, MessageSquareText, PanelsTopLeft, Workflow } from "lucide-react";
import { BookingFunnel } from "@/components/booking-funnel";
import { CrmPreview } from "@/components/crm-preview";
import { FaqSection } from "@/components/faq-section";
import { MobileStickyBar } from "@/components/mobile-sticky-bar";

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
    <section className="bg-background pb-14 pt-24 sm:pb-20 sm:pt-36 lg:pb-28 lg:pt-44">
      <div className="site-container grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="max-w-2xl">
          <span className="site-rule" aria-hidden="true" />
          <p className="mt-5 text-sm font-medium text-gold sm:mt-7">CRM para agências que vendem Orlando</p>
          <h1 className="site-heading mt-4 text-[clamp(2.1rem,7vw,4.75rem)] text-foreground sm:mt-5">
            Orlando exige contexto. Sua operação também.
          </h1>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted sm:mt-7 sm:text-lg sm:leading-8">
            A Destraflow Tech reúne atendimento no WhatsApp, inteligência artificial,
            cotações e acompanhamento em uma plataforma feita para a rotina da agência.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#agendar" className="site-button site-button-primary w-full sm:w-auto">
              Agendar conversa <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#solucao" className="site-button site-button-secondary w-full sm:w-auto">
              Conhecer a solução
            </a>
          </div>
          <p className="mt-4 text-xs text-faint sm:mt-5 sm:text-sm">Você escolhe um horário e fala com o time sobre a sua operação.</p>
        </div>
        <CrmPreview />
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section id="solucao" className="border-t border-border bg-surface py-14 sm:py-20 lg:py-28">
      <div className="site-container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-gold">A solução</p>
            <h2 className="site-heading mt-3 max-w-lg text-2xl text-foreground sm:mt-4 sm:text-4xl lg:text-5xl">
              O atendimento ganha continuidade.
            </h2>
          </div>
          <p className="max-w-[66ch] text-base leading-relaxed text-muted sm:pt-9 sm:leading-8">
            Uma venda de Orlando passa por datas, viajantes, ingressos, hospedagem e muitas
            conversas. O CRM mantém essas informações próximas de quem atende, enquanto a
            IA ajuda nas etapas configuradas para a agência.
          </p>
        </div>
        <div className="mt-10 grid gap-6 border-t border-border pt-8 sm:mt-14 sm:gap-8 sm:pt-10 md:grid-cols-3">
          {capabilities.map((item) => (
            <article key={item.title} className="max-w-sm">
              <item.icon className="h-6 w-6 text-gold" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-4 text-lg font-medium tracking-tight text-foreground sm:mt-6 sm:text-xl">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm sm:leading-7">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeliverySection() {
  return (
    <section id="entregas" data-theme="dark" className="bg-background py-14 text-foreground sm:py-20 lg:py-28">
      <div className="site-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <span className="site-rule" aria-hidden="true" />
            <h2 className="site-heading mt-6 max-w-lg text-2xl sm:mt-7 sm:text-4xl lg:text-5xl">A plataforma acompanha o trabalho real.</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted sm:mt-6 sm:leading-8">
              As telas reúnem o que a equipe precisa para atender, preparar propostas e
              acompanhar oportunidades.
            </p>
            <a href="#agendar" className="site-button site-button-primary mt-6 w-full sm:mt-8 sm:w-auto">Conversar sobre a implantação</a>
          </div>
          <div className="grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-2">
            {delivery.map((item) => (
              <article key={item.title} className="min-h-36 bg-surface p-5 sm:min-h-44 sm:p-7">
                <h3 className="text-lg font-medium tracking-tight text-foreground sm:text-xl">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm sm:leading-7">{item.description}</p>
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
    <section id="como" className="bg-background py-14 sm:py-20 lg:py-28">
      <div className="site-container">
        <p className="text-sm font-medium text-gold">Como funciona</p>
        <h2 className="site-heading mt-3 max-w-2xl text-2xl text-foreground sm:mt-4 sm:text-4xl lg:text-5xl">
          Da primeira conversa ao uso diário.
        </h2>
        <div className="mt-8 grid gap-x-8 gap-y-7 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((step, index) => (
            <article key={step.title} className="border-t border-border-strong pt-4 sm:pt-5">
              <span className="text-sm font-medium text-gold">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-lg font-medium tracking-tight text-foreground sm:mt-5 sm:text-xl">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm sm:leading-7">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="equipe" className="border-y border-border bg-surface-raised py-14 sm:py-20 lg:py-28">
      <div className="site-container">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gold">Quem está por trás</p>
          <h2 className="site-heading mt-3 text-2xl text-foreground sm:mt-4 sm:text-4xl lg:text-5xl">Turismo e tecnologia na mesma conversa.</h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:mt-5 sm:leading-8">
            A plataforma combina a experiência de operação de uma agência com o trabalho
            de engenharia de software e inteligência artificial.
          </p>
        </div>
        <div className="mt-8 grid gap-6 sm:mt-12 md:grid-cols-2">
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
    <figure className="grid overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-52">
        <Image src={image} alt={alt} fill className="object-cover object-top" sizes="(max-width: 640px) 100vw, 260px" />
      </div>
      <figcaption className="flex flex-col justify-center p-5 sm:p-8">
        <h3 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">{name}</h3>
        <p className="mt-1 text-xs font-medium text-gold sm:text-sm">{role}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted sm:mt-5 sm:text-sm sm:leading-7">{bio}</p>
      </figcaption>
    </figure>
  );
}

function BookingSection() {
  return (
    <section id="agendar" data-theme="dark" className="bg-background py-14 text-foreground sm:py-20 lg:py-28">
      <div className="site-container">
        <div className="mb-8 max-w-2xl sm:mb-12">
          <span className="site-rule" aria-hidden="true" />
          <h2 className="site-heading mt-6 text-2xl sm:mt-7 sm:text-4xl lg:text-5xl">Vamos conversar sobre a sua agência.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:mt-5 sm:text-base sm:leading-8">
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
    <section className="border-t border-border bg-surface py-14 sm:py-20 lg:py-24">
      <div className="site-container flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="site-rule" aria-hidden="true" />
          <h2 className="site-heading mt-5 text-2xl text-foreground sm:mt-6 sm:text-4xl lg:text-5xl">Veja como a Destraflow se encaixa na sua operação.</h2>
        </div>
        <a href="#agendar" className="site-button site-button-primary w-full sm:w-auto shrink-0">Agendar conversa</a>
      </div>
    </section>
  );
}
