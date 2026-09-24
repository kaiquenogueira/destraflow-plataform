import type { MetadataRoute } from "next";
import { platformBrand } from "@destraflow/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = platformBrand.siteUrl;

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/politica-de-privacidade`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/termos-de-uso`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/exclusao-de-dados`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/politica-de-reembolso`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
