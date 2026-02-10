/**
 * Webhook Endpoint para Evolution API
 * 
 * Recebe eventos da Evolution API:
 * - messages.upsert: Nova mensagem recebida
 * - messages.update: Status de mensagem atualizado
 * - connection.update: Mudança de conexão WhatsApp
 * 
 * Configuração na Evolution API:
 * POST /webhook/set/{instance}
 * {
 *   "url": "https://seu-dominio.com/api/webhook/evolution",
 *   "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/evolution-webhook";

// Secret para validar requisições (opcional)
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    try {
        // Validar secret se configurado
        if (!WEBHOOK_SECRET) {
            console.error("CRITICAL: EVOLUTION_WEBHOOK_SECRET is not set! Rejecting webhook request.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const authHeader = request.headers.get("x-webhook-secret");
        if (authHeader !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Log seguro (apenas tipo de evento)
        console.log(`Evolution Webhook received: ${body?.event || "unknown"}`);

        // Processar evento
        const result = await handleWebhookEvent(body);

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error("Webhook error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// GET para health check
export async function GET() {
    return NextResponse.json({
        status: "ok",
        webhook: "evolution",
        timestamp: new Date().toISOString(),
    });
}
