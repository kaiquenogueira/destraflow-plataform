import type { Metadata } from "next";
import { LegalPage, H2, H3, P, Ul } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Exclusão de Dados — Destraflow",
  description: "Como solicitar a exclusão dos seus dados na plataforma Destraflow.",
};

export default function ExclusaoDeDadosPage() {
  return (
    <LegalPage title="Exclusão de Dados" lastUpdated="16 de setembro de 2026">
      <H2>Como solicitar a exclusão</H2>
      <P>Você pode solicitar a exclusão dos seus dados de duas formas:</P>
      <Ul>
        <li>
          <strong>Por e-mail:</strong> envie uma mensagem para <strong>privacidade@destraflow.com.br</strong> com o assunto{" "}
          <strong>&quot;Exclusão de Dados&quot;</strong>. Informe o e-mail cadastrado na conta da agência.
        </li>
        <li>
          <strong>Pelo CRM:</strong> acesse as configurações da sua conta na plataforma Destraflow e solicite a
          exclusão diretamente pelo painel.
        </li>
      </Ul>

      <H2>O que é excluído</H2>
      <P>Ao solicitar a exclusão, os seguintes dados serão removidos:</P>
      <Ul>
        <li>Dados da conta (nome, e-mail, telefone, dados de faturamento).</li>
        <li>Mensagens, contatos e mídias recebidos pela API do WhatsApp Business.</li>
        <li>Configurações da IA atendente e base de conhecimento.</li>
        <li>Leads, campanhas e histórico de atendimento.</li>
        <li>Dados de uso e logs de acesso.</li>
      </Ul>

      <H2>Prazo</H2>
      <P>
        A exclusão será realizada em até <strong>15 dias corridos</strong> após a confirmação da solicitação. Você
        receberá um e-mail confirmando a conclusão do processo.
      </P>

      <H2>Como desconectar o WhatsApp Business</H2>
      <P>Antes de solicitar a exclusão, desconecte o número do WhatsApp da plataforma:</P>
      <H3>Pelo CRM</H3>
      <P>
        Acesse as configurações de integração WhatsApp na plataforma Destraflow e clique em &quot;Desconectar&quot;.
      </P>
      <H3>Pelo WhatsApp Business / Meta Business Manager</H3>
      <P>
        Acesse o Meta Business Manager, vá em Configurações do WhatsApp &gt; Números de telefone, e remova a
        integração com a Destraflow. Isso garante que o número volte a funcionar normalmente no app WhatsApp
        Business.
      </P>

      <H2>O que pode ser retido</H2>
      <P>
        Alguns dados podem ser retidos quando houver obrigação legal ou regulatória, como registros de acesso
        (Marco Civil da Internet) e informações necessárias para defesa em processos judiciais.
      </P>

      <H2>Contato</H2>
      <P>
        Para dúvidas sobre exclusão de dados, entre em contato pelo e-mail{" "}
        <strong>privacidade@destraflow.com.br</strong>.
      </P>
    </LegalPage>
  );
}
