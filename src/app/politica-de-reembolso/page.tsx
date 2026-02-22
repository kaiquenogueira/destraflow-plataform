import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PoliticaReembolso() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans py-12 px-6">
            <div className="max-w-3xl mx-auto mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar para Home
                </Link>
            </div>
            <div className="max-w-3xl mx-auto border border-white/5 bg-slate-900/50 p-8 md:p-12">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tight">Política de <span className="text-cyan-400">Reembolso</span></h1>

                <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-white prose-a:text-cyan-400">
                    <p className="text-sm text-slate-500 mb-8 uppercase tracking-widest font-bold">Transparência em Pagamentos</p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">1. Prazo de Arrependimento</h2>
                    <p className="mb-6 leading-relaxed">
                        Em conformidade com o Código de Defesa do Consumidor, você tem o direito de solicitar reembolso integral no prazo de 7 (sete) dias após a primeira assinatura do plano, caso não esteja satisfeito com a plataforma.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">2. Processamento de Pagamento</h2>
                    <p className="mb-6 leading-relaxed">
                        Todos os reembolsos são processados na mesma forma de pagamento utilizada original.
                        O processamento é administrado com total segurança pelos nossos provedores homologados, e o tempo de crédito na fatura dependerá exclusivamente da sua instituição financeira.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">3. Cancelamentos Mensais</h2>
                    <p className="mb-6 leading-relaxed">
                        Assinaturas recorrentes podem ser canceladas a qualquer momento diretamente no painel do usuário (Dashboard). O cancelamento cessa cobranças futuras, mas após o prazo inicial de 7 dias, não fazemos estornos de mensalidades em curso.
                    </p>

                    <h2 className="text-xl mt-8 mb-4 text-white font-bold">4. Solicitação</h2>
                    <p className="mb-6 leading-relaxed">
                        Para solicitar um estorno ou tirar dúvidas sobre sua fatura, entre em contato através de nossos canais oficiais no próprio dashboard ou envie um e-mail para o nosso time de suporte operando com foco no seu sucesso!
                    </p>
                </div>
            </div>
        </div>
    );
}
