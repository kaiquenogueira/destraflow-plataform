import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bot, Zap, BarChart3, Building2, CheckCircle2, MessageCircle, Code2, Sparkles, BrainCircuit, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden selection:bg-orange-500/30">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-1000"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-1000 delay-500"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Navbar - Glassmorphism */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center group cursor-pointer relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity blur-lg rounded-full"></div>
            <Image
              src="/images/logo.png"
              alt="DestraFlow Logo"
              width={180}
              height={56}
              className="h-12 md:h-14 w-auto object-contain object-left invert brightness-200 relative z-10"
            />
          </div>

          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-300">
            <Link href="#plataforma" className="hover:text-white transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-blue-500 hover:after:w-full after:transition-all after:duration-300">Plataforma</Link>
            <Link href="#solucoes" className="hover:text-white transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-blue-500 hover:after:w-full after:transition-all after:duration-300">Soluções</Link>
            <Link href="#resultados" className="hover:text-white transition-colors relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-blue-500 hover:after:w-full after:transition-all after:duration-300">Resultados</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="relative h-11 flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-7 text-sm font-bold transition-all rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] overflow-hidden group"
            >
              <span className="relative z-10">Fazer Login</span>
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-20 md:pt-48 md:pb-32 z-10">
        <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center">

          <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-300 mb-10 rounded-full backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.15)] flex animate-in slide-in-from-bottom-5 fade-in duration-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Nova Geração B2B
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tighter mb-8 max-w-5xl animate-in slide-in-from-bottom-5 fade-in duration-700 delay-150">
            Automação de inteligência p/ <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-orange-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]">operações de escala.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400/90 max-w-3xl mb-12 leading-relaxed font-light animate-in slide-in-from-bottom-5 fade-in duration-700 delay-300">
            A infraestrutura completa p/ conectar agentes de IA conversacionais aos seus sistemas internos, reduzir custos e centralizar seus leads no CRM nativo.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-lg mx-auto mb-20 animate-in slide-in-from-bottom-5 fade-in duration-700 delay-500">
            <Link
              href="/dashboard"
              className="group relative h-14 flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-8 text-base font-bold transition-all rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.4)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.6)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative z-10 flex items-center gap-2">
                Iniciar Gratuitamente
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="#solucoes"
              className="h-14 flex items-center justify-center bg-slate-900/50 border border-slate-700/50 hover:border-slate-400/50 hover:bg-slate-800/80 text-white px-8 text-base font-semibold transition-all rounded-xl backdrop-blur-md hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              Agendar Demo
            </Link>
          </div>

          {/* Glowing Dashboard Concept Mockup */}
          <div className="w-full max-w-6xl mx-auto relative animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-700">
            <div className="absolute -inset-4 bg-gradient-to-b from-blue-500/20 to-orange-500/5 blur-2xl rounded-[2rem] opacity-50 z-0"></div>

            <div className="rounded-2xl md:rounded-[2rem] border border-slate-700/50 bg-slate-900/80 relative overflow-hidden shadow-[0_0_80px_-15px_rgba(59,130,246,0.5)] backdrop-blur-xl z-10 transform perspective-1000 hover:rotate-x-0 transition-transform duration-1000 group">
              {/* Fake Window Header */}
              <div className="w-full h-12 bg-slate-950/50 border-b border-slate-800/80 flex items-center px-6 gap-3 backdrop-blur-md relative z-20">
                <div className="flex gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-700 group-hover:bg-red-500 transition-colors shadow-inner" />
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-700 group-hover:bg-yellow-500 transition-colors shadow-inner" />
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-700 group-hover:bg-green-500 transition-colors shadow-inner" />
                </div>
                <div className="ml-4 h-5 w-48 bg-slate-800/80 rounded-md shadow-inner" />
              </div>

              {/* Mockup Content */}
              <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-slate-950/80 flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/dashboard_flow_concept.png"
                  alt="Conceito do Dashboard DestraFlow"
                  fill
                  className="object-cover object-top opacity-90 scale-100 group-hover:scale-[1.02] transition-transform duration-[2000ms] ease-out mix-blend-screen"
                  priority
                />

                {/* Glowing Nodes Simulation Overlay */}
                <div className="absolute inset-0 bg-blue-900/10 mix-blend-color-dodge pointer-events-none" />

                {/* Overlay Gradients */}
                <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Metrics Section */}
      <section id="resultados" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white text-shadow-sm">
              Métricas absolutas para operações maduras.
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto font-light">
              Desbloqueie a verdadeira eficiência escalonando com a infraestrutura certa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-10 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-colors duration-500 shadow-xl">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 blur-3xl rounded-full group-hover:bg-blue-500/40 transition-colors duration-500"></div>
              <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-4 tracking-tighter">70<span className="text-blue-500">%</span></div>
              <div className="text-lg text-slate-300 font-medium">Redução de Custos<br /><span className="text-slate-500 text-sm font-normal">Operacionais mensais</span></div>
            </div>

            <div className="bg-gradient-to-b from-blue-900/40 to-slate-900/40 backdrop-blur-md border border-blue-500/30 p-10 rounded-3xl relative overflow-hidden group hover:border-blue-400 transition-colors duration-500 shadow-[0_0_40px_rgba(37,99,235,0.2)] hover:shadow-[0_0_60px_rgba(37,99,235,0.4)] md:-translate-y-4">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-500"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-500/20 blur-3xl rounded-full group-hover:bg-orange-500/40 transition-colors duration-500"></div>
              <div className="text-7xl font-black text-white mb-4 tracking-tighter relative z-10">3<span className="text-blue-400">x</span></div>
              <div className="text-lg text-blue-100 font-medium relative z-10">Resolução Rápida<br /><span className="text-blue-300/70 text-sm font-normal">FCR acima de 95%</span></div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/50 p-10 rounded-3xl relative overflow-hidden group hover:border-orange-500/50 transition-colors duration-500 shadow-xl">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-600/20 blur-3xl rounded-full group-hover:bg-orange-500/40 transition-colors duration-500"></div>
              <div className="flex items-baseline gap-1 mb-4">
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter">&lt;3</div>
                <div className="text-3xl font-bold text-orange-500">seg</div>
              </div>
              <div className="text-lg text-slate-300 font-medium">Tempo de Resposta<br /><span className="text-slate-500 text-sm font-normal">Atendimento 24/7</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - Glassmorphism Features Grid */}
      <section id="solucoes" className="py-24 relative z-10">
        <div className="absolute inset-0 bg-slate-900/30 border-y border-white/5"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">Ecossistema Completo</h2>
            <p className="text-slate-400 text-xl font-light">Substitua soluções fragmentadas por uma infraestrutura única projetada para a era dos agentes autônomos e IA generativa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl hover:-translate-y-2 hover:border-blue-500/60 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl group-hover:text-blue-500 transition-colors duration-700 -z-10 -translate-y-8 translate-x-4">01</div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600/20 to-blue-900/20 shadow-inner border border-blue-500/30 flex items-center justify-center mb-8 rounded-2xl group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300">
                <BrainCircuit className="text-blue-400 w-8 h-8 group-hover:text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">Agentes Inteligentes</h3>
              <p className="text-slate-400 text-base leading-relaxed">Chatbots contextuais alimentados pelos dados internos da sua empresa (RAG). Atuação nativa no WhatsApp e Web, seguindo as diretrizes rígidas.</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl hover:-translate-y-2 hover:border-orange-500/60 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.3)] transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl group-hover:text-orange-500 transition-colors duration-700 -z-10 -translate-y-8 translate-x-4">02</div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600/20 to-orange-900/20 shadow-inner border border-orange-500/30 flex items-center justify-center mb-8 rounded-2xl group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-300">
                <Zap className="text-orange-400 w-8 h-8 group-hover:text-orange-300" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-orange-400 transition-colors">Workflows Modulares</h3>
              <p className="text-slate-400 text-base leading-relaxed">Editor visual infinito. Conecte módulos, desenhe árvores de decisão complexas e ative automações baseadas em eventos sem necessitar escrever código.</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-10 rounded-3xl hover:-translate-y-2 hover:border-blue-400/60 hover:shadow-[0_20px_40px_-15px_rgba(96,165,250,0.3)] transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl group-hover:text-blue-400 transition-colors duration-700 -z-10 -translate-y-8 translate-x-4">03</div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-900/20 shadow-inner border border-blue-400/30 flex items-center justify-center mb-8 rounded-2xl group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(96,165,250,0.4)] transition-all duration-300">
                <Activity className="text-blue-300 w-8 h-8 group-hover:text-blue-200" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors">CRM em Tempo Real</h3>
              <p className="text-slate-400 text-base leading-relaxed">Centralize todos os leads qualificados. Gerencie pipelines em boards visuais. Toda a operação e métricas em uma tela de extrema densidade informativa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom - Deep Gradient */}
      <section className="relative py-32 z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 z-0"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 z-0"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-blue-500/30 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-blue-200 text-sm font-medium mb-8 backdrop-blur-md">
            <Zap className="w-4 h-4 text-orange-400" />
            Acesso Imediato
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-white">
            Transforme sua operação <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">hoje.</span>
          </h2>
          <p className="text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto font-light">
            Integre a inteligência avançada do DestraFlow em seu ecossistema. Menos custos, mais conversão.
          </p>
          <div className="flex justify-center">
            <Link
              href="/dashboard"
              className="group relative h-16 flex items-center justify-center bg-white text-slate-950 px-12 text-lg font-bold transition-all rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative z-10 flex items-center gap-3">
                Criar Conta Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </span>
            </Link>
          </div>
          <p className="mt-8 text-slate-400 text-sm font-medium">14 dias grátis · Cancelamento simplificado · Setup instantâneo</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 pt-20 pb-12 relative z-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <Link href="/" className="inline-block mb-8">
                <Image
                  src="/images/logo.png"
                  alt="DestraFlow Logo"
                  width={200}
                  height={80}
                  className="h-14 md:h-16 w-auto object-contain object-left invert brightness-200 opacity-90 hover:opacity-100 transition-opacity"
                />
              </Link>
              <p className="text-base text-slate-500 max-w-sm mb-6 leading-relaxed">
                Infraestrutura de automação inteligente B2B. Conectando processos ágeis e agentes de IA perfeitamente.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-6">Plataforma</h4>
              <ul className="space-y-4 text-slate-400">
                <li><Link href="#solucoes" className="hover:text-blue-400 transition-colors">Agentes IA</Link></li>
                <li><Link href="#solucoes" className="hover:text-blue-400 transition-colors">Builder Workflows</Link></li>
                <li><Link href="#solucoes" className="hover:text-blue-400 transition-colors">CRM Smart</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-6">Conformidade</h4>
              <ul className="space-y-4 text-slate-400">
                <li><Link href="/termos-de-servico" className="hover:text-blue-400 transition-colors">Termos de Serviço</Link></li>
                <li><Link href="/politica-de-privacidade" className="hover:text-blue-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link href="/politica-de-reembolso" className="hover:text-blue-400 transition-colors">Política de Reembolso</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/60 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 font-medium">
            <p>© {new Date().getFullYear()} DestraFlow Platforms. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span>Sistemas Operacionais 100% Core</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
