/**
 * Randevu zaman yardımcıları.
 *
 * ⏰ Dükkan saat dilimi: Europe/Istanbul. Türkiye 2016'dan beri yaz saati
 * UYGULAMIYOR → yıl boyu sabit UTC+3. Bu yüzden yerel saat ↔ UTC dönüşümünde
 * sabit "+03:00" ofsetini kullanmak güvenli VE harici kütüphane gerektirmez.
 *
 * Bu dosya saftır (DB'ye dokunmaz), böylece hem sunucu hem istemci import edebilir.
 */

export const SHOP_TIMEZONE = "Europe/Istanbul";
export const SHOP_UTC_OFFSET = "+03:00";

/**
 * Dükkan yerel tarih+saatini gerçek bir UTC anına çevirir.
 * @param dateISO "YYYY-MM-DD"  @param timeHHMM "HH:MM"
 * Örn. ("2026-07-15","14:00") → 2026-07-15T11:00:00.000Z
 */
export function shopLocalToUtc(dateISO: string, timeHHMM: string): Date {
  return new Date(`${dateISO}T${timeHHMM}:00${SHOP_UTC_OFFSET}`);
}

/**
 * Bir takvim gününün haftagünü: 0=Pazar, 1=Pazartesi ... 6=Cumartesi.
 * (Postgres `dow` ve working_hours.weekday ile uyumlu.)
 * Haftagünü tamamen tarihe bağlı olduğundan saat dilimi önemsiz — UTC'de hesaplarız.
 */
export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Bir ISO tarihine gün ekler/çıkarır: ("2026-07-15", 3) → "2026-07-18". */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Dakika → "HH:MM". 615 → "10:15" */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" (ve "HH:MM:SS") → gece yarısından geçen dakika. "10:15" → 615 */
export function hhmmToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Dükkan yerel "şu an": bugünün "YYYY-MM-DD"'si ve gece yarısından geçen dakika.
 * Sunucu hangi saat diliminde olursa olsun İstanbul'a göre hesaplar.
 */
export function shopNow(): { dateISO: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0; // bazı ortamlar gece yarısını "24" verebilir
  return { dateISO, minutes: hour * 60 + Number(get("minute")) };
}

/**
 * Bir UTC anının dükkan yerelindeki günü ve gece yarısından geçen dakikası.
 * Takvim ızgarasında randevu bloklarını konumlandırmak için kullanılır.
 */
export function shopDateTimeOf(iso: string): { dateISO: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/**
 * Verilen tarihin içinde bulunduğu haftanın PAZARTESİ'sini döner.
 * ("2026-07-10" Cuma → "2026-07-06" Pazartesi)
 */
export function mondayOf(dateISO: string): string {
  const wd = weekdayOf(dateISO); // 0=Pazar..6=Cumartesi
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDaysISO(dateISO, diff);
}

/** Randevu takviminde gösterilecek bir gün. */
export type DayOption = {
  iso: string; // "2026-07-15"
  weekday: number; // 0=Pazar..6=Cumartesi
  dayNum: string; // "15"
  monthShort: string; // "Tem"
  weekdayShort: string; // "Sal"
  long: string; // "Salı, 15 Temmuz 2026"
  isToday: boolean;
};

/**
 * Bugünden itibaren `horizonDays` günlük takvim listesi üretir (dükkan yerel).
 * Etiketler Türkçe biçimlendirilir. Sunucuda çağrılır ki "bugün" doğru olsun.
 */
export function buildDayOptions(horizonDays: number): DayOption[] {
  const { dateISO: today } = shopNow();
  const shortFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: SHOP_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const longFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: SHOP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const out: DayOption[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const iso = addDaysISO(today, i);
    const noon = new Date(`${iso}T12:00:00${SHOP_UTC_OFFSET}`); // etiketleme için güvenli an
    const parts = shortFmt.formatToParts(noon);
    const pick = (type: string) =>
      (parts.find((p) => p.type === type)?.value ?? "").replace(".", "");
    out.push({
      iso,
      weekday: weekdayOf(iso),
      dayNum: pick("day"),
      monthShort: pick("month"),
      weekdayShort: pick("weekday"),
      long: longFmt.format(noon),
      isToday: i === 0,
    });
  }
  return out;
}
