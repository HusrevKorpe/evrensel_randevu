/**
 * YANIT SÜRESİ (RESPONSE DEADLINE) — ustanın bir randevu talebini
 * onaylaması/reddetmesi için son an.
 *
 * ⏱️ Neden sabit "60 dk" değil? Çünkü:
 *   • Usta çalışırken (elinde makas) telefona bakamaz → dükkan KAPALIYKEN
 *     sayaç durmalı.
 *   • Müşteri, randevusuna GİTMEDEN önce cevabı bilmeli → randevuya çok az
 *     kala hâlâ "bekliyor" olmamalı.
 *
 * Bu yüzden son an = şu ikisinden HANGİSİ ÖNCE gelirse:
 *   1) Mutlak tavan: randevuya `MIN_LEAD_MIN` dakika kala.
 *   2) Açık-saat penceresi: talepten itibaren `RESPONSE_WINDOW_OPEN_MIN`
 *      kadar dükkan AÇIK dakikası biriktir (kapalıyken sayaç durur).
 * Ayrıca her koşulda ustaya en az `MIN_GRACE_MIN` dakika tanınır (son dakika
 * alınan randevu anında zaman aşımına düşmesin).
 *
 * Bu dosya SAFTIR (DB'ye dokunmaz) → kolay test edilir, sunucudan çağrılır.
 */

import {
  addDaysISO,
  hhmmToMinutes,
  minutesToHHMM,
  shopDateTimeOf,
  shopLocalToUtc,
  weekdayOf,
} from "@/lib/booking/time";

// ── Ayarlanabilir eşikler (istersek buradan oynarız) ────────────────────
/** Talepten itibaren biriktirilecek AÇIK dükkan dakikası (2 saat). */
export const RESPONSE_WINDOW_OPEN_MIN = 120;
/** Randevuya bu kadar dakika kala hâlâ bekliyorsa zaman aşımı (mutlak tavan). */
export const MIN_LEAD_MIN = 30;
/** Her koşulda ustaya tanınan asgari yanıt süresi (son dakika randevuları için). */
export const MIN_GRACE_MIN = 30;

/** haftagünü (0=Pazar..6=Cumartesi) → o günkü açık pencere (dakika). */
export type WeeklyHours = Record<number, { open: number; close: number }>;

type WorkingHourRow = {
  weekday: number;
  start_time: string;
  end_time: string;
};

/** working_hours satırlarından haftalık açık-pencere haritası kurar. */
export function weeklyHoursFromRows(rows: WorkingHourRow[]): WeeklyHours {
  const weekly: WeeklyHours = {};
  for (const r of rows) {
    weekly[r.weekday] = {
      open: hhmmToMinutes(r.start_time),
      close: hhmmToMinutes(r.end_time),
    };
  }
  return weekly;
}

/**
 * Bir randevu talebinin yanıt son anını hesaplar.
 * @param weekly Randevunun ATANDIĞI berberin haftalık açık saatleri.
 * @returns Son an (UTC Date). Bu andan sonra hâlâ `pending` ise zaman aşımı.
 */
export function computeResponseDeadline(params: {
  createdAtISO: string;
  startsAtISO: string;
  weekly: WeeklyHours;
}): Date {
  const createdMs = new Date(params.createdAtISO).getTime();
  const startsMs = new Date(params.startsAtISO).getTime();

  // 1) Mutlak tavan: randevuya MIN_LEAD_MIN kala.
  const absoluteCap = startsMs - MIN_LEAD_MIN * 60_000;

  // 2) Açık-saat penceresi: created_at'ten ileri doğru yürü, açık dakikaları
  //    biriktir; pencere dolduğu ana kadar. Dükkan kapalıysa o gün atlanır.
  const start = shopDateTimeOf(params.createdAtISO); // { dateISO, minutes }
  let cursorDate = start.dateISO;
  let cursorMin = start.minutes;
  let remaining = RESPONSE_WINDOW_OPEN_MIN;
  // Yedek: hiç açık gün bulunmazsa (saat tanımsız) düz duvar-saatine düş.
  let windowMs = createdMs + RESPONSE_WINDOW_OPEN_MIN * 60_000;

  for (let i = 0; i < 21; i++) {
    const wh = params.weekly[weekdayOf(cursorDate)];
    if (wh) {
      const openStart = Math.max(cursorMin, wh.open);
      if (openStart < wh.close) {
        const avail = wh.close - openStart;
        if (avail >= remaining) {
          const hitMin = openStart + remaining;
          windowMs = shopLocalToUtc(cursorDate, minutesToHHMM(hitMin)).getTime();
          break;
        }
        remaining -= avail;
      }
    }
    cursorDate = addDaysISO(cursorDate, 1);
    cursorMin = 0; // ertesi gün baştan
  }

  // 3) İkisinden ERKEN olanı; ama her koşulda en az MIN_GRACE_MIN yanıt süresi.
  const graceFloor = createdMs + MIN_GRACE_MIN * 60_000;
  const deadline = Math.max(Math.min(absoluteCap, windowMs), graceFloor);
  return new Date(deadline);
}
