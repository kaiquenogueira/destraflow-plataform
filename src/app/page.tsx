import Image from "next/image";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FlaskConical,
  Megaphone,
  MessageCircle,
  SlidersHorizontal,
  UserRoundCheck,
} from "lucide-react";
import { BookingFunnel } from "@/components/booking-funnel";
import { CrmPreview } from "@/components/crm-preview";
import { FaqSection } from "@/components/faq-section";

const resources = [
  {
    icon: SlidersHorizontal,
    title: "Playbook da agência",
    description: "Configure produtos, perguntas de qualificação, respostas e tom de voz para que a IA siga o jeito da sua agência atender.",
  },
  {
    icon: FlaskConical,
    title: "Simulador e modo assistido",
    description: "Teste conversas antes de ativar o atendimento. No modo assistido, seu time pode editar e aprovar rascunhos antes do envio.",
  },
  {
    icon: CalendarDays,
    title: "Vídeo pelo Google Agenda",
    description: "Quando a integração está configurada, o CRM ajuda a agendar a conversa de venda, gerar o link do Meet e enviar lembretes.",
  },
  {
    icon: Megaphone,
    title: "Campanhas no WhatsApp",
    description: "Selecione o público e revise o conteúdo antes de enviar uma oferta. Os envios seguem as regras de mensagens do WhatsApp.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Painel da operação",
    description: "Acompanhe oportunidades por etapa, cotações pendentes e conversas que precisam de atenção. Consulte indicadores de vendas, atendimento e custos.",
  },
];

const setupSteps = [
  {
    title: "Mapeamos seu atendimento",
    description: "Entendemos os produtos que você vende, o que deve entrar no briefing e quando o consultor precisa assumir.",
  },
  {
    title: "Conectamos o WhatsApp e configuramos a IA",
    description: "Conectamos o número pela API oficial do WhatsApp e configuramos perguntas, produtos e regras de follow-up.",
  },
  {
    title: "Testamos o fluxo com sua equipe",
    description: "Simulamos pedidos típicos da agência e mostramos ao time como assumir conversas, tratar briefings e acompanhar propostas.",
  },
];

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CrmPreview />
      <ResourcesSection />
      <SetupSection />
      <TeamSection />
      <FaqSection />
      <section id="agendar" data-theme="dark" className="border-t border-border bg-background py-12 text-foreground sm:py-24" aria-labelledby="booking-title">
        <div className="site-container">
          <BookingFunnel />
        </div>
      </section>
    </>
  );
}

function HeroSection() {
  return (
    <section data-theme="dark" className="landing-hero relative isolate overflow-hidden border-b border-border text-foreground">
      <div className="site-container grid items-center gap-10 pt-28 pb-14 sm:pt-36 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.94fr)] lg:gap-12 lg:pt-40 lg:pb-24">
        <div>
          <p className="landing-eyebrow text-gold">CRM para agências que vendem Orlando</p>
          <h1 className="mt-5 text-[clamp(2.375rem,5vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.065em] text-balance">
            Do WhatsApp ao <span className="text-gold">briefing de cotação.</span>
          </h1>
          <p className="mt-6 max-w-[30rem] text-base leading-relaxed text-muted sm:text-lg">
            A IA atende no WhatsApp, confirma o que o viajante precisa e organiza o pedido no CRM. Seu consultor recebe as informações para montar a proposta e acompanhar a negociação.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 max-sm:flex-col">
            <a href="#agendar" className="site-button site-button-primary min-h-12">Agendar demonstração</a>
            <a href="#solucao" className="site-button site-button-secondary min-h-12">Ver o CRM por dentro</a>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="size-4 shrink-0 text-gold" aria-hidden="true" />
            Demonstração gratuita de 45 minutos
          </p>
        </div>
        <HeroExample />
      </div>
    </section>
  );
}

function HeroExample() {
  return (
    <figure className="min-w-0">
      <div className="rounded-overlay border border-signature/30 bg-background p-2.5 shadow-(--shadow-md) sm:p-3">
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <MessageCircle className="size-4 text-success" aria-hidden="true" />
              Conversa no WhatsApp
            </div>
            <span className="rounded-full bg-success-subtle px-2.5 py-1 text-xs font-medium text-success">Em qualificação</span>
          </div>
          <div className="space-y-3 p-4 text-sm leading-relaxed sm:px-5 sm:py-5">
            <div className="max-w-[94%] rounded-2xl rounded-tl-sm bg-surface-raised px-3.5 py-2.5 text-foreground sm:max-w-[84%]">
              <span className="block text-xs font-semibold text-muted">Viajante</span>
              Quero levar minha família para Orlando. Precisamos de hotel e ingressos.
            </div>
            <div className="ml-auto max-w-[94%] rounded-2xl rounded-tr-sm bg-success-subtle px-3.5 py-2.5 text-foreground sm:max-w-[84%]">
              <span className="block text-xs font-semibold text-success">Atendente IA</span>
              Quais são as datas da viagem? Quantos adultos e crianças vão viajar?
            </div>
          </div>
          <div className="border-t border-border bg-background p-4 sm:p-5">
            <div className="rounded-card border border-signature/30 bg-primary-subtle p-3.5 sm:p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gold">
                <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
                Briefing pronto para o consultor
              </p>
              <dl className="mt-3 grid grid-cols-[0.85fr_1fr_1.15fr] gap-2.5 border-t border-signature/25 pt-3">
                <div><dt className="text-xs text-muted">Viagem</dt><dd className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">10 a 20 dez.</dd></div>
                <div><dt className="text-xs text-muted">Viajantes</dt><dd className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">2 adultos, 1 criança</dd></div>
                <div><dt className="text-xs text-muted">Produtos</dt><dd className="mt-0.5 text-xs font-semibold text-foreground sm:text-sm">Hotel e ingressos</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-right text-xs text-muted">Exemplo ilustrativo de conversa e briefing</figcaption>
    </figure>
  );
}

function ResourcesSection() {
  return (
    <section id="entregas" data-theme="dark" className="bg-background py-16 text-foreground sm:py-24 lg:py-28">
      <div className="site-container">
        <div className="max-w-2xl">
          <p className="landing-eyebrow text-gold">Recursos do CRM</p>
          <h2 className="landing-heading mt-3">Configure como a IA atende e quando sua equipe entra.</h2>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
          <article className="flex flex-col justify-between gap-8 rounded-card border border-signature/30 bg-primary-subtle p-5 sm:p-7">
            <UserRoundCheck className="size-6 text-gold" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Sua equipe pode assumir a conversa</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">
                Assuma o atendimento pelo CRM. Se o número estiver conectado em modo de coexistência, a equipe também pode responder pelo app WhatsApp Business e pausar a IA.
              </p>
            </div>
          </article>
          {resources.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex flex-col justify-between gap-8 rounded-card border border-border bg-surface p-5 sm:p-7">
              <Icon className="size-6 text-gold" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SetupSection() {
  return (
    <section id="como" className="border-t border-border bg-background py-16 text-foreground sm:py-24">
      <div className="site-container grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <div>
          <p className="landing-eyebrow text-gold">Implantação</p>
          <h2 className="landing-heading mt-3">Do seu processo atual ao CRM.</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            Na demonstração, usamos um exemplo de atendimento para mostrar como a plataforma pode se encaixar na sua operação.
          </p>
          <a href="#agendar" className="site-button site-button-primary mt-6 min-h-12 max-sm:w-full">Agendar demonstração</a>
        </div>
        <ol className="space-y-5">
          {setupSteps.map(({ title, description }, index) => (
            <li key={title} className="flex gap-4 border-t border-border pt-5 sm:gap-6">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-signature/40 text-sm font-semibold text-gold">{index + 1}</span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="equipe" className="border-y border-border bg-surface-raised py-14 sm:py-20 lg:py-28">
      <div className="site-container">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gold">Quem somos</p>
          <h2 className="site-heading mt-3 text-2xl text-foreground sm:mt-4 sm:text-4xl lg:text-5xl">O CRM nasceu na operação da Encantrip.</h2>
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
            objectPosition="center 42%"
          />
          <TeamMember
            image="/images/kaique.png"
            name="Kaique"
            role="Tecnologia e inteligência artificial"
            alt="Kaique, responsável pela tecnologia da Destraflow Tech"
            bio="Trabalha na arquitetura do CRM, nas integrações e nos fluxos de inteligência artificial da Destraflow Tech."
            objectPosition="center 25%"
          />
        </div>
      </div>
    </section>
  );
}

function TeamMember({
  image,
  name,
  role,
  alt,
  bio,
  objectPosition = "center",
}: {
  image: string;
  name: string;
  role: string;
  alt: string;
  bio: string;
  objectPosition?: string;
}) {
  return (
    <figure className="grid overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="relative aspect-[4/5] sm:aspect-auto sm:min-h-52">
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover"
          style={{ objectPosition }}
          sizes="(max-width: 640px) 100vw, 260px"
        />
      </div>
      <figcaption className="flex flex-col justify-center p-5 sm:p-8">
        <h3 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">{name}</h3>
        <p className="mt-1 text-xs font-medium text-gold sm:text-sm">{role}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted sm:mt-5 sm:text-sm sm:leading-7">{bio}</p>
      </figcaption>
    </figure>
  );
}
