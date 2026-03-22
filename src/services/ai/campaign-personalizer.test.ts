import { describe, it, expect, vi } from 'vitest';
import { CampaignPersonalizer, LeadContext } from './campaign-personalizer';

describe('CampaignPersonalizer', () => {
    const mockLead: LeadContext = {
        name: 'João Silva',
        interest: 'Software de automação',
        aiSummary: 'Cliente quer automatizar disparos de WhatsApp para aumentar conversão.',
        notes: ['Cliente achou caro na última reunião', 'Pediu para retornar no início do mês']
    };

    const originalTemplate = "Olá {{nome}}, temos uma promoção especial no nosso sistema de CRM hoje. Responda para saber mais.";

    it('deve retornar a mensagem original se a API Key não for fornecida', async () => {
        const personalizer = new CampaignPersonalizer({ apiKey: '' });
        const result = await personalizer.personalize(originalTemplate, mockLead);
        expect(result).toBe(originalTemplate);
    });

    it('deve retornar a mensagem original se não houver contexto relevante (notas, interesse ou resumo)', async () => {
        const personalizer = new CampaignPersonalizer({ apiKey: 'fake-key' });
        const result = await personalizer.personalize(originalTemplate, {
            name: 'Maria',
            notes: []
        });
        expect(result).toBe(originalTemplate);
    });

    it('deve retornar a mensagem reescrita com sucesso quando a API da OpenAI responde corretamente', async () => {
        const fakeResponse = "Fala João Silva! Lembrei que no início do mês você pediu para retornarmos. Temos uma promoção especial no nosso CRM que cabe no bolso e vai te ajudar a automatizar os disparos. Quer saber os detalhes?";
        
        const mockFetcher = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: fakeResponse } }
                ]
            })
        });

        const personalizer = new CampaignPersonalizer({ 
            apiKey: 'fake-key',
            fetcher: mockFetcher as unknown as typeof fetch 
        });

        const result = await personalizer.personalize(originalTemplate, mockLead);
        
        expect(result).toBe(fakeResponse);
        expect(mockFetcher).toHaveBeenCalledTimes(1);
        
        // Verifica se o prompt injetou corretamente o contexto
        const requestBody = JSON.parse(mockFetcher.mock.calls[0][1].body);
        const userPrompt = requestBody.messages[1].content;
        expect(userPrompt).toContain('João Silva');
        expect(userPrompt).toContain('achou caro');
    });

    it('deve retornar a mensagem original como fallback se a requisição dar timeout ou erro', async () => {
        // Simulando um erro de rede/timeout
        const mockFetcher = vi.fn().mockRejectedValue(new Error('Timeout de rede'));

        const personalizer = new CampaignPersonalizer({ 
            apiKey: 'fake-key',
            fetcher: mockFetcher as unknown as typeof fetch 
        });

        const result = await personalizer.personalize(originalTemplate, mockLead);
        
        // NUNCA deve quebrar a aplicação, apenas logar o warn e retornar original
        expect(result).toBe(originalTemplate);
    });

    it('deve retornar a mensagem original se a API da OpenAI retornar erro (ex: 429 Rate Limit)', async () => {
        const mockFetcher = vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
        });

        const personalizer = new CampaignPersonalizer({ 
            apiKey: 'fake-key',
            fetcher: mockFetcher as unknown as typeof fetch 
        });

        const result = await personalizer.personalize(originalTemplate, mockLead);
        
        expect(result).toBe(originalTemplate);
    });
});
