import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, Zap, BarChart3, Users, Network, Building2, CheckCircle2, MessageCircle, Code2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden selection:bg-blue-500/30">

      {/* Navbar - Corporate Minimal */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="DestraFlow Logo"
              width={160}
              height={48}
              className="h-10 md:h-12 w-auto object-contain object-left invert brightness-200"
            />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <Link href="#plataforma" className="hover:text-blue-400 transition-colors">Plataforma</Link>
            <Link href="#solucoes" className="hover:text-blue-400 transition-colors">Soluções</Link>
            <Link href="#resultados" className="hover:text-blue-400 transition-colors">Resultados</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="h-9 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-5 text-sm font-semibold transition-colors rounded-sm shadow-sm"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Trust & App Store Pattern */}
      <main className="relative pt-32 pb-16 md:pt-40 md:pb-24 border-b border-white/5">
        {/* Abstract Corporate Flow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src="/images/b2b_flow_background.png"
            alt="Fluxo de dados corporativo"
            fill
            className="object-cover opacity-[0.15] mix-blend-screen animate-flow"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">

          <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 mb-8 rounded-full">
            Nova Geração B2B
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6 max-w-4xl">
            Automação de inteligência para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">operações de escala.</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
            A infraestrutura completa para conectar agentes de IA conversacionais aos seus sistemas internos, reduzir custos operacionais em 70% e centralizar seus leads no CRM nativo.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto mb-16">
            <Link
              href="/dashboard"
              className="h-12 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-8 text-sm font-bold tracking-wide transition-colors rounded-sm shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] group"
            >
              Iniciar Gratuitamente
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#solucoes"
              className="h-12 flex items-center justify-center bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-white px-8 text-sm font-semibold transition-colors rounded-sm"
            >
              Agendar Demo
            </Link>
          </div>

          {/* Generative AI Dashboard Concept Mockup */}
          <div className="w-full max-w-5xl mx-auto rounded-t-xl md:rounded-t-2xl border-x border-t border-slate-800 bg-slate-950 relative overflow-hidden shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)] group backdrop-blur-sm z-10 transition-transform duration-700 hover:-translate-y-2">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

            <div className="w-full h-8 bg-slate-900/90 border-b border-slate-800 flex items-center px-4 gap-2 backdrop-blur-md z-20 relative">
              <div className="flex gap-1.5 border-r border-slate-700 pr-4 mr-2">
                <div className="w-3 h-3 rounded-full bg-slate-700 group-hover:bg-red-500/50 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-slate-700 group-hover:bg-yellow-500/50 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-slate-700 group-hover:bg-green-500/50 transition-colors" />
              </div>
              <div className="h-4 w-32 bg-slate-800/80 rounded-sm" />
            </div>

            <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-slate-950 flex items-center justify-center overflow-hidden">
              <Image
                src="/images/dashboard_flow_concept.png"
                alt="Conceito do Dashboard DestraFlow"
                fill
                className="object-cover object-center opacity-80 group-hover:scale-105 transition-transform duration-[1500ms] ease-out mix-blend-lighten"
                priority
              />
              <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none" />

              {/* Bottom Fade Mask */}
              <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />
            </div>
          </div>
        </div>
      </main>

      {/* Features Bar */}
      <section className="py-10 border-b border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Funcionalidades Reais da Plataforma</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-80">
            <div className="flex items-center gap-2 font-medium text-lg text-slate-300"><Bot className="w-5 h-5 text-blue-400" /> Agentes Inteligentes</div>
            <div className="flex items-center gap-2 font-medium text-lg text-slate-300"><Building2 className="w-5 h-5 text-orange-400" /> CRM Integrado</div>
            <div className="flex items-center gap-2 font-medium text-lg text-slate-300"><Zap className="w-5 h-5 text-green-400" /> Workflows Visuais</div>
          </div>
        </div>
      </section>

      {/* Trust & Results Section (Metrics First) */}
      <section id="resultados" className="py-24 bg-slate-950 relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Métricas absolutas para operações maduras.</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                A transição para a IA generativa em atendimento e workflows internos não é uma métrica de vaidade. É sobre cortar ineficiências latentes em sua cadeia de custos.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-slate-300">Resolução no primeiro contato (FCR) acima de 95%.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-slate-300">Tempo de resposta em menos de 3 segundos, 24 horas por dia.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-slate-300">Onboarding de tecnologia reduzido de meses para dias.</span>
                </li>
              </ul>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-8 border border-slate-800 rounded-sm">
                <div className="text-5xl font-black text-white mb-2 tracking-tight">70<span className="text-blue-500">%</span></div>
                <div className="text-sm text-slate-400 font-medium">Redução de Custos Operacionais</div>
              </div>
              <div className="bg-blue-600 p-8 border border-blue-500 rounded-sm shadow-xl mt-8">
                <div className="text-5xl font-black text-white mb-2 tracking-tight">3<span className="text-blue-300">x</span></div>
                <div className="text-sm text-blue-100 font-medium">Mais Rápido na Resolução</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Clean Features Grid */}
      <section id="solucoes" className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">Ecossistema Completo</h2>
            <p className="text-slate-400 text-lg">Substitua soluções fragmentadas por uma infraestrutura única projetada para a era dos agentes autônomos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 p-8 border border-slate-800 rounded-sm hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 bg-blue-900/30 border border-blue-800 flex items-center justify-center mb-6 rounded-sm">
                <Bot className="text-blue-400 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">Agentes de IA Específicos</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">Chatbots contextuais alimentados pelos dados internos da sua empresa (RAG). Atuação nativa no WhatsApp e Web, seguindo as diretrizes rígidas do seu tom de voz.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-sm hover:-translate-y-1 transition-transform group relative overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />
              <div className="relative z-10 p-8 flex-grow">
                <div className="w-12 h-12 bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-6 rounded-sm relative overflow-hidden">
                  <Zap className="text-slate-300 w-6 h-6 relative z-10 group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">Workflows Modulares</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Editor visual infinito. Conecte módulos, desenhe árvores de decisão e ative automações baseadas em eventos (webhooks) sem escrever uma linha de código backend.</p>
              </div>

              {/* Feature Image Accent */}
              <div className="relative w-full h-32 mt-auto border-t border-slate-800/50 bg-slate-950/50">
                <Image
                  src="/images/ai_network_flow.png"
                  alt="Fluxo de Rede de IA"
                  fill
                  className="object-cover opacity-50 group-hover:opacity-100 transition-all mix-blend-screen scale-110 group-hover:scale-100 duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 p-8 border border-slate-800 rounded-sm hover:-translate-y-1 transition-transform group">
              <div className="w-12 h-12 bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-6 rounded-sm">
                <BarChart3 className="text-slate-300 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">CRM em Tempo Real</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">Centralize os leads que seus Agentes capturam. Gerencie o pipeline em board Kanban. Toda a operação em uma tela de alta densidade informativa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Impact / Platform Realities */}
      <section className="py-24 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-16">Descubra o impacto na sua operação!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-sm flex flex-col items-start hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-sm flex items-center justify-center mb-6 border border-blue-500/20">
                <MessageCircle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Conexão Nativa com WhatsApp</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Integre seus agentes diretamente ao WhatsApp. Filtre leads frios e envie para o seu CRM apenas os contatos qualificados, automatizando o primeiro atendimento e escalando seu time comercial de forma inteligente.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-sm flex flex-col items-start hover:border-orange-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/10 rounded-sm flex items-center justify-center mb-6 border border-orange-500/20">
                <Code2 className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Autonomia Tecnológica Total</h3>
              <p className="text-slate-400 leading-relaxed text-lg">
                Esqueça os meses lentos de desenvolvimento. Crie, teste e publique fluxos de conversação utilizando nossa interface modular, garantindo independência absoluta para sua equipe de suporte ou operações.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom (High Conversion Orange) */}
      <section className="py-24 relative overflow-hidden bg-blue-600 border-y border-blue-500">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:30px_30px]" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">Revolucione a operação da sua empresa.</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
            Integre a inteligência do DestraFlow em seu ecossistema ainda hoje de forma segura e imediata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="h-14 flex items-center justify-center bg-slate-950 hover:bg-slate-900 text-white px-10 text-sm font-bold tracking-widest transition-colors shadow-xl rounded-sm"
            >
              Criar Conta (14 dias grátis)
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <Image
                  src="/images/logo.png"
                  alt="DestraFlow Logo"
                  width={200}
                  height={80}
                  className="h-16 md:h-20 w-auto object-contain object-left invert brightness-200"
                />
              </div>
              <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                Infraestrutura de automação inteligente B2B. Conectando pessoas, processos e agentes de IA perfeitamente.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-wider mb-4">Plataforma</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="#solucoes" className="hover:text-blue-400 transition-colors">Painel de Agentes</Link></li>
                <li><Link href="#solucoes" className="hover:text-blue-400 transition-colors">Builder Visual</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-wider mb-4">Políticas & Conformidade</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><Link href="/termos-de-servico" className="hover:text-blue-400 transition-colors">Termos de Serviço</Link></li>
                <li><Link href="/politica-de-privacidade" className="hover:text-blue-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link href="/politica-de-reembolso" className="hover:text-blue-400 transition-colors">Sistema de Reembolso</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium tracking-wide">
            <p>© {new Date().getFullYear()} DestraFlow Platforms. Todos os direitos reservados.</p>
            <p>Auditoria PCI DSS (Stripe) Ativa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
