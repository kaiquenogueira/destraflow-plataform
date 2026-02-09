import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");

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
            async authorized() {
                // This is required for the middleware to run
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/login"],
};
