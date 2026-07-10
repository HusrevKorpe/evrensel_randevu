/**
 * Sitenin merkezi ayarları — dükkan bilgilerini TEK yerden değiştir.
 * (İsim, iletişim, sosyal medya vs. buradan yönetilir.)
 *
 * 🙋 Buradaki bilgiler örnek/placeholder — gerçek dükkan bilgilerinle değiştir.
 */
export const siteConfig = {
  name: "BERBER",
  slogan: "Modern Erkek Kuaförü",
  description:
    "Online randevunu saniyeler içinde al, sıra bekleme. Saç, sakal ve bakımda mahallenin güvenilir adresi.",
  // İletişim
  phone: "+90 216 555 12 34",
  email: "randevu@berber.com",
  address: "Bağdat Cad. No:120, Kadıköy / İstanbul",
  // Sosyal medya
  instagram: "https://instagram.com/",
  instagramHandle: "@berber",
  // Dükkanın kuruluş yılı (metinlerde kullanılır)
  foundedYear: 2009,
  // Site kök adresi (deploy sonrası güncellenecek)
  url: "https://berber.example.com",
} as const;

export type SiteConfig = typeof siteConfig;
