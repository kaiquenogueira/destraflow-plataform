# Implementação B: Supervisor de Campanhas Inteligentes (Isolado e Seguro)

A implementação do **Supervisor de Campanhas** foi feita sob uma arquitetura 100% isolada e "fail-safe" (à prova de falhas), garantindo que os disparos atuais continuem funcionando perfeitamente.

## 1. O que foi feito?

Criamos um módulo independente localizado em `src/services/ai/campaign-personalizer.ts`. 

**Características da Arquitetura Isolada:**
- **Zero Dependências Extras:** Usamos `fetch` nativo para a OpenAI (sem precisar instalar SDKs que podem inchar o projeto).
- **Fallback Automático (Fail-Safe):** Se a API demorar (timeout configurado para 5s), cair, ou se a chave não estiver configurada, o serviço imediatamente "desiste" e retorna a mensagem original. **A fila de disparos nunca irá travar.**
- **Condição de Disparo Otimizada:** Se o lead não tiver contexto útil (nenhuma anotação, sem resumo, sem interesse), o LLM nem sequer é chamado. Isso economiza custos de API absurdamente.
- **100% Testado:** Implementamos testes unitários (`src/services/ai/campaign-personalizer.test.ts`) que cobrem sucesso, timeout, erros de rede e ausência de chave API. (Os testes já passaram com sucesso ✔️).

---

## 2. Como integrar (Sem quebrar a aplicação atual)

A integração deve ser feita no **Worker** (`src/lib/worker.ts`), mas de forma assíncrona, interceptando a mensagem *apenas* na hora de pegar do banco, antes do disparo real.

### Passo a Passo da Integração

**No arquivo `src/lib/worker.ts`:**

1. Importe o personalizador:
```typescript
import { CampaignPersonalizer } from "@/services/ai/campaign-personalizer";
const aiPersonalizer = new CampaignPersonalizer();
```

2. Na função `processTenantMessages`, ao buscar a lista de `pendingMessages`, você precisará fazer um `include` das anotações e interesses do Lead:
```typescript
const pendingMessages = await tenantPrisma.campaignMessage.findMany({
    // ... manter o where existente ...
    include: {
        lead: {
            select: { 
                phone: true, 
                name: true,
                interest: true,
                aiSummary: true,
                notes: { select: { content: true } } // <--- ADICIONAR ISSO
            },
        },
    },
    // ...
});
```

3. Antes de disparar a mensagem no loop (`evolutionClient.sendMessage`), adicione a chamada do personalizador:
```typescript
// Extrair o contexto do lead
const leadContext = {
    name: message.lead.name,
    interest: message.lead.interest,
    aiSummary: message.lead.aiSummary,
    notes: message.lead.notes.map(n => n.content)
};

// 💡 INTEGRAÇÃO ISOLADA: Se falhar, retorna o message.payload original
const finalPayload = await aiPersonalizer.personalize(message.payload, leadContext);

// Enviar a mensagem (usando o finalPayload em vez do original)
await evolutionClient.sendMessage(message.lead.phone, finalPayload);
```

4. Adicione a variável de ambiente `.env`:
```env
OPENAI_API_KEY="sk-sua-chave-aqui"
```

## 3. Por que isso é seguro?

- Se a chave não existir, `finalPayload` será igual ao `message.payload`.
- Se a OpenAI cair, `finalPayload` será igual ao `message.payload`.
- Se o lead for "frio" (sem anotações), não tem chamada de API.
- O Cron/Worker continua processando tudo no mesmo ritmo (pois o timeout do fetch corta requisições lentas em 5 segundos no máximo).

Você pode aplicar esse código em produção que os disparos atuais vão continuar funcionando, e apenas os leads com histórico vão começar a receber mensagens "mágicas".