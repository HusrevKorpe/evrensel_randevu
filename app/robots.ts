import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * robots.txt — arama motoru tarayıcılarına hangi sayfaların açık olduğunu
 * söyler. Admin paneli ve API uçları taranmasın; vitrin + randevu taransın.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
