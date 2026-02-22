import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { redis, isRedisEnabled } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Fallback Rate Limiting em memória (Nota: em serverless/edge, isso é volátil)
const memoryRateLimit = new Map<string, { count: number; lastReset: number }>();

// Rate Limiter via Upstash: 60 requisições a cada 1 minuto (60s)
const ratelimit = isRedisEnabled
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit/destraflow",
    })
    : null;

async function checkRateLimit(ip: string): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
    if (ratelimit) {
        try {
            const result = await ratelimit.limit(ip);
            return result;
        } catch (error) {
            console.error("Redis Rate Limit Error, bypassing:", error);
            return { success: true };
        }
    }

    // Fallback Local
    const now = Date.now();
    const WINDOW_MS = 60 * 1000;
    const MAX_REQUESTS = 60;

    const record = memoryRateLimit.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > WINDOW_MS) {
        record.count = 0;
        record.lastReset = now;
    }

    record.count++;
    memoryRateLimit.set(ip, record);

    return { success: record.count <= MAX_REQUESTS };
}

export default withAuth(
    async function proxy(req) {
        // 1. Rate Limiting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ip = req.headers.get("x-forwarded-for") || (req as any).ip || "unknown";

        const rateLimitResult = await checkRateLimit(ip);
        if (!rateLimitResult.success) {
            const response = new NextResponse("Too Many Requests", { status: 429 });
            if (rateLimitResult.limit !== undefined) response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
            if (rateLimitResult.remaining !== undefined) response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
            if (rateLimitResult.reset !== undefined) response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());
            return response;
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
