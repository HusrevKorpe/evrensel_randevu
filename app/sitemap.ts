import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/**
 * sitemap.xml — arama motorlarına dizinlenecek sayfaların listesi.
 * Sitede herkese açık 2 sayfa var: anasayfa + randevu.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/randevu`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
