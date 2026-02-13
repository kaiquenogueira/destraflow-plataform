import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Mapa simples para Rate Limiting em memória (Nota: em serverless/edge, isso é volátil)
// TODO: Em produção com Vercel/Serverless, substituir por Redis (ex: Upstash)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function isRateLimited(ip: string) {
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minuto
    const MAX_REQUESTS = 60; // 60 requisições por minuto por IP

    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > WINDOW_MS) {
        record.count = 0;
        record.lastReset = now;
    }

    record.count++;
    rateLimitMap.set(ip, record);

    return record.count > MAX_REQUESTS;
}

export default withAuth(
    function proxy(req) {
        // 1. Rate Limiting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";
        if (isRateLimited(ip)) {
            return new NextResponse("Too Many Requests", { status: 429 });
        }

        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");
        const isWebhook = req.nextUrl.pathname.startsWith("/api/webhook");

        // Permitir Webhook sem auth (mas com rate limit já aplicado acima)
        if (isWebhook) {
            return null;
        }

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
            return null;
        }

        if (!isAuth) {
            let from = req.nextUrl.pathname;
            if (req.nextUrl.search) {
                from += req.nextUrl.search;
            }

            return NextResponse.redirect(
                new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
            );
        }

        // Role based protection for /admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
            if (token?.role !== "ADMIN") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                // Permitir acesso ao webhook sem autenticação
                if (req.nextUrl.pathname.startsWith("/api/webhook")) {
                    return true;
                }
                // Rotas de login também são públicas
                if (req.nextUrl.pathname.startsWith("/login")) {
                    return true;
                }
                // Demais rotas exigem token
                return !!token;
            },
        },
    }
);

export const config = {
    // Adicionado /api/webhook para ser processado pelo middleware (para rate limit)
    matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/api/webhook/:path*"],
};
