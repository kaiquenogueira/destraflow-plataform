import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.destraflow.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      // Motores de busca tradicionais (Google, Bing)
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Googlebot-Video",
          "GoogleOther",
          "Bingbot",
        ],
        allow: "/",
        disallow: ["/api/"],
      },
      // Provedores de IA, Agentes e LLM Search (OpenAI, Anthropic, Perplexity, Google Gemini, Apple Intelligence, Meta AI, Cohere)
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "PerplexityBot",
          "Claude-Web",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot",
          "Applebot-Extended",
          "Meta-ExternalAgent",
          "Meta-ExternalFetcher",
          "cohere-ai",
        ],
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
