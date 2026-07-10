/**
 * Sitenin merkezi ayarları — dükkan bilgilerini TEK yerden değiştir.
 * (İsim, iletişim, sosyal medya vs. buradan yönetilir.)
 */
export const siteConfig = {
  name: "BERBER",
  slogan: "Modern Erkek Kuaförü",
  description:
    "Online randevunu saniyeler içinde al, sıra bekleme. Modern erkek kuaförü ve berber hizmetleri.",
  // Faz 2'de gerçek bilgilerle doldurulacak:
  phone: "+90 500 000 00 00",
  email: "randevu@berber.com",
  address: "Örnek Mah. Örnek Cad. No:1, İstanbul",
  instagram: "https://instagram.com/",
  // Site kök adresi (deploy sonrası güncellenecek)
  url: "https://berber.example.com",
} as const;

export type SiteConfig = typeof siteConfig;
