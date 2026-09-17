import type { Metadata } from "next";
import { LegalPage, H2, P, Ul } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Reembolso — Destraflow",
  description: "Política de Reembolso da plataforma Destraflow.",
};

export default function PoliticaDeReembolsoPage() {
  return (
    <LegalPage title="Política de Reembolso" lastUpdated="16 de setembro de 2026">
      <H2>1. Generalidades</H2>
      <P>
        Esta Política de Reembolso complementa os Termos de Uso da plataforma Destraflow e aplica-se a todos os
        pagamentos realizados pela agência junto a Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA.
      </P>

      <H2>2. Solicitação de reembolso</H2>
      <P>
        A agência pode solicitar o reembolso de valores pagos nos seguintes casos:
      </P>
      <Ul>
        <li>Cobrança indevida ou em desacordo com o plano contratado.</li>
        <li>Falha comprovada na prestação do serviço por período superior a 24 horas consecutivas.</li>
        <li>Cancelamento do serviço dentro do prazo de arrependimento previsto no Código de Defesa do Consumidor (7 dias).</li>
      </Ul>

      <H2>3. Como solicitar</H2>
      <P>
        Envie um e-mail para <strong>contato@destraflow.com.br</strong> com o assunto &quot;Solicitação de Reembolso&quot;,
        informando:
      </P>
      <Ul>
        <li>Nome da agência e e-mail cadastrado.</li>
        <li>Data e valor da cobrança.</li>
        <li>Motivo da solicitação.</li>
      </Ul>

      <H2>4. Prazo de análise</H2>
      <P>
        A solicitação será analisada em até <strong>10 dias úteis</strong>. Em caso de aprovação, o reembolso será
        realizado pelo mesmo meio de pagamento original em até 30 dias.
      </P>

      <H2>5. Exclusões</H2>
      <P>Não são passíveis de reembolso:</P>
      <Ul>
        <li>Cobranças referentes a períodos em que o serviço foi utilizado normalmente.</li>
        <li>Valores cobrados diretamente pela Meta pelo uso da API do WhatsApp Business.</li>
        <li>Solicitações realizadas fora do prazo de arrependimento legal, sem justa causa.</li>
      </Ul>

      <H2>6. Contato</H2>
      <P>
        Para dúvidas sobre esta política, entre em contato pelo e-mail <strong>contato@destraflow.com.br</strong>.
      </P>
    </LegalPage>
  );
}
