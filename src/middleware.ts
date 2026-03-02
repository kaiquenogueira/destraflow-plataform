import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isAuth = !!req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");

    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const isCronRoute = req.nextUrl.pathname.startsWith("/api/cron");
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");
        
        // Sempre permitir rotas cron (elas têm proteção própria)
        if (isCronRoute) return true;

        // Sempre permitir página de login (o redirecionamento é feito no middleware function acima)
        if (isAuthPage) return true;

        // Para outras rotas, exigir autenticação
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/cron (Cron jobs)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - images (public images)
     * - politica-de-privacidade
     * - politica-de-reembolso
     * - termos-de-servico
     */
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|login|images|politica-de-privacidade|politica-de-reembolso|termos-de-servico).*)",
  ],
};
