import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * robots.txt — arama motoru tarayıcılarına hangi sayfaların açık olduğunu
 * söyler. Admin paneli, API uçları ve berberin onay sayfası taranmasın;
 * vitrin + randevu taransın.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/randevu/onay"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
