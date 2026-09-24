import type { Metadata } from "next";
import { LegalPage, H2, H3, P, Ul } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade — Destraflow Tech",
  description: "Política de Privacidade da Destraflow. Como tratamos seus dados e os dados dos seus clientes.",
  alternates: { canonical: "/politica-de-privacidade" },
};

export default function PoliticaDePrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" lastUpdated="16 de setembro de 2026">
      <H2>1. Controlador</H2>
      <P>
        Kaique Nogueira Meneses Consultoria em Tecnologia da Informação LTDA, pessoa jurídica inscrita no CNPJ sob nº 59.459.911/0001-24, com sede em Av. Paulista, 1106, Sala 01 Andar 16, Bela Vista, São Paulo - SP, CEP 01.310-914, é a
        controladora dos dados tratados pela plataforma Destraflow.
      </P>
      <P>Contato: contato@destraflow.com.br · Dados e privacidade: privacidade@destraflow.com.br.</P>

      <H2>2. Papel da Destraflow</H2>
      <Ul>
        <li>
          <strong>Dados da conta do usuário:</strong> a Destraflow é controladora dos dados cadastrais da conta
          (nome, e-mail, telefone, dados de faturamento) fornecidos pelo responsável da agência.
        </li>
        <li>
          <strong>Dados dos clientes finais das agências:</strong> a Destraflow atua como operadora dos dados dos
          clientes finais das agências que utilizam a plataforma (mensagens, contatos, mídias). A agência é a
          controladora desses dados.
        </li>
      </Ul>

      <H2>3. Dados tratados</H2>
      <H3>3.1 Dados da conta</H3>
      <P>Nome, e-mail, telefone, dados de faturamento e preferências de configuração da conta da agência.</P>

      <H3>3.2 Dados do WhatsApp Business</H3>
      <P>
        Mensagens, contatos, mídias e modelos de mensagem do WhatsApp Business da agência, recebidos pela API oficial
        da Meta (WhatsApp Business Platform / Cloud API) com autorização expressa da agência.
      </P>

      <H3>3.3 Dados de uso</H3>
      <P>
        Endereço IP, tipo de navegador, páginas acessadas, data e hora de acesso, e informações de desempenho da
        plataforma.
      </P>

      <H2>4. Finalidades</H2>
      <Ul>
        <li>Fornecimento e operação da plataforma Destraflow.</li>
        <li>Atendimento ao cliente e suporte técnico.</li>
        <li>Comunicações relacionadas ao serviço (avisos de manutenção, atualizações).</li>
        <li>Cumprimento de obrigações legais e regulatórias.</li>
        <li>Segurança e prevenção contra fraudes.</li>
      </Ul>

      <H2>5. Bases legais (LGPD)</H2>
      <P>
        O tratamento de dados pessoais se fundamenta nas seguintes bases legais da Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018):
      </P>
      <Ul>
        <li>Consentimento do titular (art. 7º, I).</li>
        <li>Execução de contrato ou procedimento preliminar (art. 7º, V).</li>
        <li>Legítimo interesse do controlador (art. 7º, IX).</li>
        <li>Cumprimento de obrigação legal ou regulatória (art. 7º, II).</li>
      </Ul>

      <H2>6. Compartilhamento com suboperadores</H2>
      <P>
        Os dados podem ser compartilhados com os seguintes suboperadores, exclusivamente para a prestação do serviço:
      </P>
      <Ul>
        <li>
          <strong>Meta / WhatsApp:</strong> para recebimento e envio de mensagens pela API oficial do WhatsApp
          Business Platform.
        </li>
        <li>
          <strong>Provedor de inteligência artificial:</strong> para processamento de linguagem natural e geração de
          respostas da IA atendente.
        </li>
        <li>
          <strong>Hospedagem e infraestrutura:</strong> para armazenamento seguro dos dados.
        </li>
        <li>
          <strong>E-mail transacional:</strong> para envio de comunicações do serviço.
        </li>
      </Ul>
      <P>
        <strong>Não vendemos dados pessoais nem os utilizamos para publicidade.</strong>
      </P>

      <H2>7. Transferência internacional</H2>
      <P>
        Alguns suboperadores podem estar localizados fora do Brasil. Nesses casos, adotamos cláusulas contratuais
        padronizadas e medidas técnicas adequadas para garantir o nível de proteção exigido pela LGPD.
      </P>

      <H2>8. Retenção</H2>
      <P>
        Os dados são mantidos pelo tempo necessário para a prestação do serviço ou conforme exigido por lei. Após a
        rescisão do contrato ou solicitação de exclusão, os dados são eliminados em até 15 dias, ressalvadas as
        hipóteses de retenção por obrigação legal.
      </P>

      <H2>9. Segurança e isolamento</H2>
      <P>
        Os dados de cada agência ficam isolados e não são acessíveis por outras agências. Adotamos medidas técnicas
        e organizacionais apropriadas para proteger os dados contra acesso não autorizado, perda ou destruição.
      </P>

      <H2>10. Direitos do titular</H2>
      <P>
        Nos termos do art. 18 da LGPD, o titular pode exercer os seguintes direitos: confirmação da existência de
        tratamento, acesso, correção, anonimização, portação, eliminação, informação sobre compartilhamento,
        revogação do consentimento e oposição.
      </P>
      <P>
        Para exercer seus direitos, envie um e-mail para <strong>privacidade@destraflow.com.br</strong> com o assunto
        &quot;Direitos do Titular — LGPD&quot;.
      </P>

      <H2>11. Cookies</H2>
      <P>
        A plataforma utiliza cookies essenciais para funcionamento do site. Não utilizamos cookies de rastreamento
        ou publicidade.
      </P>

      <H2>12. Encarregado</H2>
      <P>
        Para questões relacionadas à proteção de dados, entre em contato com o encarregado pelo e-mail{" "}
        <strong>privacidade@destraflow.com.br</strong>.
      </P>
    </LegalPage>
  );
}
