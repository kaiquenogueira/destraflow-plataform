/**
 * Cron Endpoint para processar mensagens pendentes
 * 
 * Este endpoint deve ser chamado periodicamente (ex: a cada minuto)
 * via Vercel Cron, GitHub Actions, ou similar.
 * 
 * Configuração Vercel (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-messages",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { processAllTenantMessages, updateCampaignStatuses } from "@/lib/worker";

// Chave de segurança para evitar chamadas não autorizadas
const CRON_SECRET = process.env.CRON_SECRET;

// Configuração para Vercel (Pro plan): aumentar timeout para 5 minutos
export const maxDuration = 300;
export const dynamic = 'force-dynamic'; // Garantir que não seja estático

export async function GET(request: NextRequest) {
    // Verificar autorização
    const authHeader = request.headers.get("authorization");

    // Segurança obrigatória: Rejeitar se não houver secret configurado ou se o header não bater
    if (!CRON_SECRET) {
        console.error("CRITICAL: CRON_SECRET is not set! Refusing to run cron job.");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const startTime = Date.now();

        // Processar mensagens pendentes
        const messageResults = await processAllTenantMessages();

        // Atualizar status das campanhas
        const campaignsUpdated = await updateCampaignStatuses();

        const duration = Date.now() - startTime;

        // Resumo
        const totalProcessed = Object.values(messageResults.results).reduce(
            (acc, r) => acc + r.processed,
            0
        );
        const totalSent = Object.values(messageResults.results).reduce(
            (acc, r) => acc + r.sent,
            0
        );
        const totalFailed = Object.values(messageResults.results).reduce(
            (acc, r) => acc + r.failed,
            0
        );

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            summary: {
                tenants: messageResults.tenants,
                messagesProcessed: totalProcessed,
                messagesSent: totalSent,
                messagesFailed: totalFailed,
                campaignsUpdated,
            },
            details: messageResults.results,
        });
    } catch (error) {
        console.error("Cron error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// Também permitir POST para testes manuais
export async function POST(request: NextRequest) {
    return GET(request);
}
