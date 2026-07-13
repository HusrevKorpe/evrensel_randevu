/**
 * Görüntüleme yardımcıları — fiyat, süre, saat, gün adları.
 * Formatlama mantığı TEK yerde toplansın ki site genelinde tutarlı görünsün.
 */

const nf = new Intl.NumberFormat("tr-TR");

/** 250 → "250 ₺", 1250 → "1.250 ₺" */
export function formatPrice(price: number): string {
  return `${nf.format(price)} ₺`;
}

/** 30 → "30 dk", 60 → "1 sa", 90 → "1 sa 30 dk" */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

/** Postgres time değeri "10:00:00" → "10:00" */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** UTC timestamp → dükkan yerel saati "14:30" (İstanbul, sabit UTC+3). */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** UTC timestamp → "Cuma, 10 Temmuz 2026" (dükkan yerel). */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** UTC timestamp → "Perşembe, 17 Temmuz" (dükkan yerel, kısa — yıl yok). */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

/** "+90 216 555 12 34" → "tel:+902165551234" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Gün indeksi → ad. 0=Pazar ... 6=Cumartesi (Postgres dow ile uyumlu). */
export const WEEKDAY_LABELS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

/** Haftayı Pazartesi'den başlatıp Pazar'da bitiren gösterim sırası. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
