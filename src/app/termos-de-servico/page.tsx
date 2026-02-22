import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermosServico() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans py-12 px-6">
            <div className="max-w-3xl mx-auto mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar para Home
                </Link>
            </div>
            <div className="max-w-3xl mx-auto border border-white/5 bg-slate-900/50 p-8 md:p-12">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tight">Termos de <span className="text-cyan-400">Serviço</span></h1>

                <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-cyan-400">
                    <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-bold">Última atualização: Fevereiro de 2025</p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">1. Aceitação dos Termos</h2>
                    <p className="mb-6 leading-relaxed">
                        Ao acessar e usar a plataforma DestraFlow, você concorda em cumprir estes termos de serviço. Se você não concordar, não deverá usar nossos serviços.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">2. Plataforma e Serviços</h2>
                    <p className="mb-6 leading-relaxed">
                        A DestraFlow fornece ferramentas de criação de workflows modulares, CRM e agentes de inteligência artificial (IA) projetados para o mercado B2B. O uso continuado da plataforma constitui a aceitação incondicional destas regras operacionais.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">3. Requisitos de Cobranças e Pagamentos</h2>
                    <p className="mb-6 leading-relaxed">
                        Os pagamentos são processados de forma segura através dos nossos provedores de pagamento homologados, em conformidade com os padrões PCI DSS.
                        Ao fornecer informações de pagamento, você autoriza a cobrança dos valores correspondentes ao plano contratado. Não armazenamos seus dados sensíveis de transação.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">4. Limitação de Responsabilidade</h2>
                    <p className="mb-6 leading-relaxed">
                        Os serviços são fornecidos &quot;como estão&quot;. Não garantimos que a plataforma estará livre de interrupções ou erros, embora dediquemos enorme esforço ativo para manter uptime elevado (99.9%).
                    </p>
                </div>
            </div>
        </div>
    );
}
