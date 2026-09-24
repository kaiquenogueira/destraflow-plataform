import type { NextConfig } from "next";
import { platformBrand } from "@destraflow/brand";

const siteHost = new URL(platformBrand.siteUrl).host;

const nextConfig: NextConfig = {
  transpilePackages: ["@destraflow/brand"],

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${siteHost}` }],
        destination: `${platformBrand.siteUrl}/:path*`,
        permanent: true,
      },
      { source: "/termos-de-servico", destination: "/termos-de-uso", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
