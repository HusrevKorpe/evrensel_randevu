/**
 * Sitenin merkezi ayarları — dükkan bilgilerini TEK yerden değiştir.
 * (İsim, iletişim, sosyal medya vs. buradan yönetilir.)
 */
export const siteConfig = {
  name: "Evrensel Kuaför",
  slogan: "Modern Erkek Kuaförü",
  description:
    "Online randevunu saniyeler içinde al, sıra bekleme. Saç, sakal ve bakımda mahallenin güvenilir adresi.",
  // İletişim
  phone: "0507 121 36 55",
  email: "randevu@berber.com",
  address: "Kutlubey Mah. 1006. Sk. Eski Adliye Karşısı, Isparta",
  // Sosyal medya
  instagram: "https://instagram.com/evrenselkuafor",
  instagramHandle: "@evrenselkuafor",
  // Dükkanın kuruluş yılı (metinlerde kullanılır)
  foundedYear: 2009,
  // Site kök adresi — ortam değişkeninden gelir (Vercel'de canlı URL,
  // lokalde localhost). SEO/OG/sitemap hep bunu kullanır.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
