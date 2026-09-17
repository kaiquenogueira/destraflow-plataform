import type { Metadata } from "next";
import { LegalPage, H2, P, Ul } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso — Destraflow",
  description: "Termos de Uso da plataforma Destraflow.",
};

export default function TermosDeUsoPage() {
  return (
    <LegalPage title="Termos de Uso" lastUpdated="16 de setembro de 2026">
      <H2>1. Objeto</H2>
      <P>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma Destraflow, serviço de CRM com atendente
        de inteligência artificial no WhatsApp, oferecido por Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA, CNPJ 59.459.911/0001-24.
      </P>

      <H2>2. Conta</H2>
      <P>
        Para utilizar a plataforma, é necessário criar uma conta com informações verdadeiras e mantê-las
        atualizadas. O responsável pela conta declara ter autoridade para vincular a agência aos presentes Termos.
      </P>
      <P>
        A senha é de responsabilidade exclusiva do titular. A agência deve notificar imediatamente qualquer uso não
        autorizado de sua conta.
      </P>

      <H2>3. Uso aceitável</H2>
      <P>A agência se compromete a não utilizar a plataforma para:</P>
      <Ul>
        <li>Enviar spam ou mensagens em massa não solicitadas.</li>
        <li>Transmitir conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros.</li>
        <li>Violar as políticas do WhatsApp Business, incluindo as políticas de comércio e mensagens.</li>
        <li>Tentar acessar áreas restritas da plataforma ou de outras agências.</li>
        <li>Utilizar a plataforma para qualquer finalidade que possa prejudicar o serviço ou outros usuários.</li>
      </Ul>

      <H2>4. Responsabilidade da agência</H2>
      <P>
        A agência é responsável pelo conteúdo enviado por meio da plataforma, incluindo mensagens, materiais e
        configurações da IA atendente.
      </P>
      <P>
        A agência declara ter obtido o consentimento necessário de seus clientes para o tratamento de seus dados
        pessoais e para o envio de mensagens pelo WhatsApp, em conformidade com a LGPD e as políticas da Meta.
      </P>

      <H2>5. Limitações da IA</H2>
      <P>
        A inteligência artificial da Destraflow é uma ferramenta de apoio ao atendimento. A agência reconhece que a
        IA pode gerar respostas imprecisas, especialmente em relação a preços, condições de pagamento e
        disponibilidade de pacotes.
      </P>
      <P>
        <strong>Recomenda-se revisão humana para informações sensíveis</strong>, como cotações de preço e condições
        contratuais, antes do envio ao cliente final.
      </P>

      <H2>6. Cobrança da Meta</H2>
      <P>
        As cobranças da Meta pelo uso da API do WhatsApp Business (conversações) são de responsabilidade direta da
        agência. A Destraflow não intermediia nem é responsável por esses valores.
      </P>

      <H2>7. Suspensão</H2>
      <P>
        A Destraflow pode suspender o acesso da agência à plataforma, sem aviso prévio, em caso de violação destes
        Termos, uso indevido ou risco à segurança da plataforma ou de outros usuários.
      </P>

      <H2>8. Rescisão</H2>
      <P>
        Qualquer das partes pode rescindir este contrato a qualquer momento, mediante aviso prévio de 30 dias. Em
        caso de rescisão, a agência deve solicitar a exclusão de seus dados conforme a Política de Exclusão de
        Dados.
      </P>

      <H2>9. Foro</H2>
      <P>
        Fica eleito o foro da Comarca de São Paulo/SP, com renúncia expressa a qualquer outro, por mais privilegiado
        que seja, para dirimir quaisquer controvérsias decorrentes destes Termos.
      </P>
    </LegalPage>
  );
}
