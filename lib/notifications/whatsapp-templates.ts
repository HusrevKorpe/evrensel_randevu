import { siteConfig } from "@/lib/site";
import { formatClock, formatDateLong } from "@/lib/format";
import type { AppointmentStatus } from "@/types";

/**
 * WHATSAPP MESAJ ŞABLONLARI (panelden ELLE gönderim).
 *
 * E-posta (templates.ts) ve push (push-templates.ts) şablonlarının aksine
 * bunlar OTOMATİK GİTMEZ ve sunucudan geçmez: berber panelde "WhatsApp"
 * butonuna basar, mesaj kendi telefonundaki (ya da WhatsApp Web'indeki)
 * yazı kutusuna hazır düşer, isterse düzenler ve gönderir.
 *
 * Bu yüzden ne sağlayıcı, ne API anahtarı, ne başlık/şablon onayı gerekir —
 * maliyeti sıfırdır. Mesaj berberin KENDİ numarasından çıkar, müşteri de
 * doğrudan ona cevap yazabilir.
 *
 * Metin randevunun DURUMUNA göre değişir ki berber en sık ihtiyaç duyduğu
 * cümleyi hazır bulsun (teyit, onay, iptal özrü, "gelmedin" hatırlatması).
 */

export type WhatsAppMessageData = {
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAtISO: string;
};

/** "Cuma, 10 Temmuz 2026 · 14:30" */
function when(iso: string): string {
  return `${formatDateLong(iso)} · ${formatClock(iso)}`;
}

/** Selamlama — adın yalnızca ilk kelimesi ("Ahmet Yılmaz" → "Merhaba Ahmet"). */
function greeting(name: string): string {
  const first = name.trim().split(/\s+/)[0] || name.trim();
  return `Merhaba ${first},`;
}

/** Yeni randevu almak isteyen müşteri için sitedeki randevu adresi. */
function bookingUrl(): string {
  return `${siteConfig.url}/randevu`;
}

/**
 * Randevunun durumuna uygun hazır WhatsApp metni.
 * Satır sonları (\n) wa.me linkinde korunur — mesaj WhatsApp'ta da
 * buradaki gibi çok satırlı görünür.
 */
export function whatsappMessage(
  status: AppointmentStatus,
  d: WhatsAppMessageData,
): string {
  const hi = greeting(d.customerName);
  const time = when(d.startsAtISO);

  switch (status) {
    // Talep geldi, usta henüz onaylamadı → teyit iste.
    case "pending":
      return [
        hi,
        `${siteConfig.name}'den yazıyoruz. ${time} için ${d.serviceName} randevu talebini aldık ✂️`,
        "Saat sende de uygunsa hemen onaylayalım — yazman yeterli.",
      ].join("\n");

    // Onaylandı → net bilgi + hatırlatma.
    case "confirmed":
      return [
        hi,
        "Randevun onaylandı ✅",
        `📅 ${time}`,
        `✂️ ${d.serviceName} — ${d.barberName}`,
        `${siteConfig.name}'de bekliyoruz!`,
      ].join("\n");

    // Geldi ve işlem bitti → teşekkür + tekrar randevu daveti.
    case "completed":
      return [
        hi,
        "Bugün bize uğradığın için teşekkürler 🙏 Umarız memnun kalmışsındır.",
        `Bir sonraki randevunu buradan alabilirsin: ${bookingUrl()}`,
        `Tekrar bekleriz — ${siteConfig.name}`,
      ].join("\n");

    // Gelmedi → suçlamadan, kapıyı açık bırakan hatırlatma.
    case "no_show":
      return [
        hi,
        `${time} randevunda seni bekledik ama gelemedin, bir aksilik mi oldu?`,
        `Dilersen yeni bir saat ayarlayalım — buradan yazman yeterli. ${siteConfig.name}`,
      ].join("\n");

    // İptal/red → özür + alternatif.
    case "cancelled":
      return [
        hi,
        `${time} tarihli randevun iptal edildi, kusura bakma.`,
        `Uygun başka bir saat için bize yazabilir ya da buradan yeni randevu alabilirsin: ${bookingUrl()}`,
        siteConfig.name,
      ].join("\n");
  }
}
