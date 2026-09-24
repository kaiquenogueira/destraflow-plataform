# Proposta de DS para a landing Destraflow Tech

- **Estado:** proposta para revisão visual, sem implementação de interface nesta PR.
- **Data:** 24/09/2026.
- **Fonte vigente:** `@destraflow/brand@0.1.0`, distribuída pelo repositório `ai-crm` e fixada nesta landing.

## Intenção e critério de aceite

O fundador quer validar uma nova proposta de design system no navegador antes de aplicá-la à landing. A proposta deve tornar visíveis, em uma página isolada, os padrões que poderão ser usados no site e comparados com a identidade do CRM. O público da amostra é quem decide o desenho e quem o implementa; não é uma nova página comercial para visitantes.

A decisão de marca da S41 continua vigente: **Destraflow Tech**, símbolo D da fonte compartilhada, Inter e preto/dourado. O objetivo desta proposta é melhorar a composição e a consistência de componentes, não redefinir a marca ou copiar cores para o consumidor. O contrato está no [design da marca](https://github.com/plataformaencantrip-stack/ai-crm/blob/main/docs/design/destraflow-tech.md) e no [ADR-0098](https://github.com/plataformaencantrip-stack/ai-crm/blob/main/docs/adr/0098-a-plataforma-se-chama-destraflow-tech.md).

A proposta está pronta para decisão quando o fundador conseguir:

1. Abrir a amostra local ou no preview da PR e entender, em uma tela responsiva, a hierarquia de marca, títulos, texto, ações e superfícies.
2. Ver exemplos de foco, desabilitado, seleção e entrada de formulário, nos temas claro e escuro, sem precisar enviar dados.
3. Comparar uma prévia sintética do produto com o login e a landing atuais para julgar a continuidade da identidade.
4. Aprovar ou apontar ajustes por padrão, antes de qualquer troca da home ou do CRM.

## Caminhos considerados

| Caminho | Ganho | Limite |
| --- | --- | --- |
| Aplicar diretamente na home | Mostra o desenho no contexto comercial final | Mistura a avaliação visual com o risco de alterar captação, navegação e SEO antes da escolha |
| Documento estático | Fácil de comentar e guardar | Não prova responsividade, foco, toque nem estados de controle |
| **Página isolada de demonstração** | Permite avaliar a proposta no navegador e manter a home atual como referência | Exige um artefato temporário e uma decisão posterior para adotar os padrões |

O terceiro caminho é o proposto. A rota candidata é `/proposta-ds`, fora da navegação principal, sem indexação e sem entrada no sitemap. O cabeçalho e o rodapé existentes podem permanecer como moldura; a página tem navegação interna própria entre os exemplos. A rota não será confundida com uma funcionalidade do CRM ou com um canal de captação.

## Direção visual

### Composição

A amostra usa um início escuro, de contraste forte, como assinatura do produto, seguido de uma área editorial clara e espaçada para leitura. Um filete dourado assina a composição; não vira a cor de todos os botões ou títulos. Blocos de amostra usam fundo creme, superfície branca, bordas finas e alinhamentos previsíveis. Áreas escuras aparecem onde a inversão do sistema pode ser julgada, não como efeito decorativo em toda seção.

O texto principal usa uma linha curta e Inter em peso 400 com tracking negativo. Rótulos e dados usam pesos maiores para separar função de expressão. Na amostra de marketing, o corpo começa em 16px; controles e exemplos do CRM podem usar a escala densa da fonte. A largura respeita `--page-max-width`; no mobile, tudo se reorganiza em uma coluna sem recortes horizontais.

### Papéis de token

| Papel | Uso proposto |
| --- | --- |
| `--background`, `--surface`, `--surface-raised` | Chão, cartão e camada elevada, sem sombra em superfícies comuns |
| `--text`, `--text-muted`, `--text-faint` | Hierarquia de leitura nos fundos previstos pelo pacote |
| `--primary`, `--primary-foreground`, `--primary-hover` | Ação principal e interação, invertidas pelo tema |
| `--brand-signature` | Símbolo, filete e superfície decorativa; nunca texto pequeno no claro |
| `--brand-gold` | Texto de marca com contraste AA nos temas previstos |
| `--border`, `--border-strong` | Separação e contorno de controles |
| `--success`, `--warning`, `--danger`, `--info` | Estados funcionais, com rótulo textual além da cor |

Essas variáveis são **consumidas**, não redeclaradas com valores na landing. A ponte Tailwind existente em `globals.css` continua ligada a `@destraflow/brand/tokens.css`. Novos papéis compartilhados, se necessários após a revisão, exigem nova versão do pacote produtor e atualização fixada com guarda.

### Forma e movimento

Controles usam `--radius-sm` e alvo de toque mínimo `--touch-target`; cartões usam `--radius`. A forma pill fica em rótulos, chips e avatares. Borda e mudança de superfície comunicam hover/seleção; foco visível mantém contorno de 2px. Microinterações usam `--motion-micro` e respeitam `prefers-reduced-motion`.

## Amostra no navegador

Ordem das seções da rota proposta:

1. **Abertura:** marca, título editorial, resumo de propósito e um salto para os padrões; nenhuma promessa comercial nova.
2. **Fundamentos:** escala de tipo, ritmos de espaçamento, formas e amostras de cor identificadas por papel sem duplicar valores hexadecimais.
3. **Ações e navegação:** ação primária, secundária, link, item ativo, desabilitado e foco por teclado, com rótulos que deixam claro que são exemplos.
4. **Entrada e resposta:** campos de texto, seleção, ajuda, validação e feedback. A digitação permanece apenas na página; não há submit, webhook ou link para contato real.
5. **Produto:** pequeno painel de Inbox com agência e pessoas fictícias, distinguidos da marca da plataforma. É uma amostra visual, sem alegação de resultado ou dado de cliente.
6. **Tema escuro e adaptação:** os mesmos papéis em área `data-theme="dark"` e nota de como cards e controles se reorganizam no mobile.

Esboço de hierarquia, sem fixar pixels antes de ver a renderização:

```text
┌ marca Destraflow Tech ─────────────── Proposta em avaliação ┐
│                                                              │
│  Uma linguagem para apresentar e operar.                    │
│  Padrões visuais para ler, decidir e agir.                    │
│                                              [Ver padrões ↓]  │
└──────────────────────────────────────────────────────────────┘

  01  Fundamentos        tipo · cor por papel · forma
  02  Interação          navegação · botões · campos · estados
  03  Produto            Inbox ilustrativo com dados fictícios
  04  Inversão           mesmos componentes sobre fundo escuro
```

## Limites e comportamento

- Esta proposta não altera a home, o funil, as saídas de WhatsApp/calendário, o botão “Entrar”, as páginas legais, o redirect `/termos-de-servico`, o OG ou a configuração de domínio.
- A rota de amostra terá `noindex`; não entrará na navegação pública nem no sitemap. Mesmo que alguém abra a URL, verá que é uma proposta em avaliação.
- O painel do CRM usa apenas dados sintéticos e não simula acesso autenticado. Nome da agência é dado subordinado à marca do produto.
- Nenhuma interação da amostra transmite dados ou dispara navegação para um contato real. Os exemplos de botão sem destino serão elementos não funcionais rotulados como amostras; links reais só navegam dentro da página ou de volta à landing.
- A fonte `packages/brand` permanece folha. Esta PR não modifica o produtor, não traz `@encantrip/ui` e não introduz outra cópia de tokens.

## Verificação da implementação futura

- `npm ci`, `npm run check:brand`, `npm run check:ui`, `npm run lint` e `npm run build` em checkout limpo da landing.
- Inspeção no Chrome e Safari em largura desktop e mobile, incluindo zoom de 200%, foco por teclado, toque, menu e ausência de overflow horizontal.
- Revisão visual dos pares de texto/fundo no claro e no escuro com a régua `scripts/check-ui-contrast.mjs` do produtor como referência. O resultado existente no CRM é 72/72 pares AA; a amostra não deve criar pares fora do contrato.
- Verificação de metadata `noindex`, ausência da rota no sitemap e nenhuma requisição de contato ao interagir com os exemplos.

## Decisão solicitada na revisão

Confirmar se a página isolada e esta direção de composição representam a proposta que deve ganhar preview local. Depois dessa decisão, detalhar a implementação, construir a rota e abrir a validação visual da PR antes de levar qualquer padrão para a home.
