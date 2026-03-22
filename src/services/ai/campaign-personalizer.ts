/**
 * AI Campaign Personalizer Service
 * 
 * Este módulo é TOTALMENTE ISOLADO do resto da aplicação.
 * Ele recebe um template de mensagem e os dados de contexto de um lead,
 * e usa uma IA (LLM) para reescrever a mensagem de forma hiper-personalizada.
 * 
 * PRINCÍPIOS DE DESIGN:
 * 1. Fallback garantido: Se a IA falhar (timeout, erro de API, falta de chave), 
 *    sempre retorna o template original intacto. NUNCA quebra o fluxo de envio.
 * 2. Sem dependências pesadas externas: Usa fetch nativo para a API da OpenAI.
 * 3. Testável: Injeção de dependência para a função de fetch no modo de teste.
 */

export interface LeadContext {
    name: string;
    interest?: string | null;
    aiSummary?: string | null;
    notes: string[]; // Histórico de anotações (LeadNote)
}

export interface AIPersonalizerOptions {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    // Permite injetar um mock para testes
    fetcher?: typeof fetch;
}

const DEFAULT_PROMPT = `
Você é um assistente de vendas especialista em copywriting.
Seu objetivo é reescrever uma mensagem padrão de campanha para que ela pareça natural, humana e hiper-personalizada para o lead atual, usando o histórico e contexto fornecidos.

REGRAS ESTritas:
1. Mantenha a essência, a oferta e o Call to Action (CTA) da mensagem original.
2. Use o contexto do lead (nome, interesse, anotações passadas) para criar conexão logo no início.
3. Não seja robótico. Fale como um humano no WhatsApp (pode usar emojis, mas sem exagero).
4. Retorne APENAS a mensagem reescrita. Nenhuma introdução, nenhuma aspa, nenhum comentário extra.

MENSAGEM ORIGINAL:
"{template}"

CONTEXTO DO LEAD:
- Nome: {leadName}
- Interesse: {leadInterest}
- Resumo de IA: {aiSummary}
- Anotações/Histórico:
{notes}
`;

export class CampaignPersonalizer {
    private apiKey: string;
    private model: string;
    private timeoutMs: number;
    private fetcher: typeof fetch;

    constructor(options: AIPersonalizerOptions = {}) {
        this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
        this.model = options.model || 'gpt-4o-mini';
        this.timeoutMs = options.timeoutMs || 5000; // Timeout rápido (5s) para não travar a fila de disparos
        this.fetcher = options.fetcher || globalThis.fetch;
    }

    /**
     * Tenta personalizar a mensagem com IA. Se falhar, retorna o original.
     */
    async personalize(template: string, context: LeadContext): Promise<string> {
        // 1. Se não houver chave de API, retorna original imediatamente
        if (!this.apiKey) {
            return template;
        }

        // Se não houver contexto relevante, retorna original
        if (!context.aiSummary && context.notes.length === 0 && !context.interest) {
            return template;
        }

            const prompt = this.buildPrompt(template, context);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            const response = await this.fetcher('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'Você é um assistente de reescrita de mensagens de vendas para WhatsApp.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 300,
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorPayload: { error?: { code?: string } } | null = null;
                if (typeof response.json === 'function') {
                    errorPayload = await response.json().catch(() => null);
                }
                const errorCode = errorPayload?.error?.code;

                if (response.status === 401 || errorCode === 'invalid_api_key') {
                    console.warn('[AI Personalizer] API Error: chave OPENAI_API_KEY inválida ou revogada');
                    return template;
                }

                console.warn(`[AI Personalizer] API Error: ${response.status} ${response.statusText}`);
                return template; // Fallback
            }

            const data = await response.json();
            const personalizedMessage = data.choices?.[0]?.message?.content?.trim();

            if (!personalizedMessage) {
                return template; // Fallback
            }

            return personalizedMessage;

        } catch (error) {
            console.warn(`[AI Personalizer] Failed to personalize message:`, error);
            // Fallback seguro em caso de Timeout, Network Error, etc.
            return template; 
        }
    }

    private buildPrompt(template: string, context: LeadContext): string {
        let prompt = DEFAULT_PROMPT.replace('{template}', template);
        prompt = prompt.replace('{leadName}', context.name);
        prompt = prompt.replace('{leadInterest}', context.interest || 'Não especificado');
        prompt = prompt.replace('{aiSummary}', context.aiSummary || 'Sem resumo anterior');
        
        const notesStr = context.notes.length > 0 
            ? context.notes.map(n => `- ${n}`).join('\n') 
            : 'Sem anotações passadas.';
        
        prompt = prompt.replace('{notes}', notesStr);

        return prompt;
    }
}
