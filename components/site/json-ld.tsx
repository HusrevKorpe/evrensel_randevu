import type { ShopDay } from "@/lib/data";
import { siteConfig } from "@/lib/site";

/**
 * JSON-LD yapılandırılmış veri (schema.org "BarberShop").
 * Google bunu okuyup dükkanı aramada zengin sonuçla (saatler, adres,
 * telefon) gösterebilir. Sayfada görünmez; sadece <script> etiketi basar.
 */

// schema.org gün adları — weekday indeksimizle (0=Pazar) hizalı.
const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function BarberShopJsonLd({ hours }: { hours: ShopDay[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    image: `${siteConfig.url}/hero.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address,
      addressCountry: "TR",
    },
    openingHoursSpecification: hours
      .filter((h) => h.open && h.start && h.end)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[h.weekday],
        opens: h.start,
        closes: h.end,
      })),
    potentialAction: {
      "@type": "ReserveAction",
      target: `${siteConfig.url}/randevu`,
      name: "Online Randevu Al",
    },
  };

  return (
    <script
      type="application/ld+json"
      // "<" karakterini kaçırıyoruz ki içerikte </script> geçse bile
      // etiket erken kapanmasın (XSS önlemi).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
