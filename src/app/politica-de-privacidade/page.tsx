import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PoliticaPrivacidade() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans py-12 px-6">
            <div className="max-w-3xl mx-auto mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar para Home
                </Link>
            </div>
            <div className="max-w-3xl mx-auto border border-white/5 bg-slate-900/50 p-8 md:p-12">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tight">Política de <span className="text-lime-400">Privacidade</span></h1>

                <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-cyan-400">
                    <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-bold">Respeito e Segurança de Dados</p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">1. Coleta de Informações</h2>
                    <p className="mb-6 leading-relaxed">
                        Coletamos dados necessários para prestar o melhor serviço possível. Isso inclui e-mails (como login social de provedores autorizados) para autenticação, e dados analíticos anônimos para entender melhor a usabilidade da plataforma.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">2. Como Usamos as Informações</h2>
                    <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-400">
                        <li>Para prover, manter e melhorar nossos serviços (incluindo recursos baseados em Inteligência Artificial).</li>
                        <li>Para enviar comunicações de suporte e administrativas.</li>
                        <li>Para processar pagamentos através de parceiros seguros em conformidade com PCI DSS.</li>
                    </ul>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">3. Compartilhamento de Dados</h2>
                    <p className="mb-6 leading-relaxed">
                        Nós não vendemos seus dados para terceiros. O compartilhamento ocorre apenas com os provedores essenciais para o funcionamento da plataforma (processadores de pagamento e nuvem), todos sob rigoroso acordo de confidencialidade aplicável.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">4. Segurança</h2>
                    <p className="mb-6 leading-relaxed">
                        Implementamos medidas técnicas e organizacionais adequadas para proteger suas informações pessoais contra perda, roubo, uso indevido e acesso não autorizado.
                    </p>
                </div>
            </div>
        </div>
    );
}
