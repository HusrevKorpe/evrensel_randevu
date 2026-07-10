"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Çalışma saati kaydetme (server action).
 *
 * Model basit: bir berberin TÜM haftası tek seferde kaydedilir —
 * önce doğrula, sonra berberin eski satırlarını sil, açık günleri yaz.
 * (working_hours'ta satır olmayan gün = kapalı gün.)
 */

export type WorkingHoursActionResult = { ok: boolean; error?: string };

export type WorkingDayInput = {
  weekday: number; // 0=Pazar..6=Cumartesi
  start: string; // "HH:MM"
  end: string;
  breakStart: string | null;
  breakEnd: string | null;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** DB check kısıtlarıyla birebir aynı kurallar (0001_init.sql). */
function validateDays(days: WorkingDayInput[]): string | null {
  const seen = new Set<number>();
  for (const d of days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6)
      return "Geçersiz gün.";
    if (seen.has(d.weekday)) return "Aynı gün iki kez gönderildi.";
    seen.add(d.weekday);

    if (!TIME_RE.test(d.start) || !TIME_RE.test(d.end))
      return "Saatler SS:DD biçiminde olmalı.";
    if (d.end <= d.start) return "Kapanış, açılıştan sonra olmalı.";

    const hasStart = d.breakStart !== null && d.breakStart !== "";
    const hasEnd = d.breakEnd !== null && d.breakEnd !== "";
    if (hasStart !== hasEnd) return "Mola için başlangıç VE bitiş gerekli.";
    if (hasStart && hasEnd) {
      if (!TIME_RE.test(d.breakStart!) || !TIME_RE.test(d.breakEnd!))
        return "Mola saatleri SS:DD biçiminde olmalı.";
      if (d.breakEnd! <= d.breakStart!)
        return "Mola bitişi, başlangıcından sonra olmalı.";
      if (d.breakStart! < d.start || d.breakEnd! > d.end)
        return "Mola, çalışma saatlerinin içinde kalmalı.";
    }
  }
  return null;
}

export async function saveWorkingHours(
  barberId: string,
  days: WorkingDayInput[],
): Promise<WorkingHoursActionResult> {
  await requireAdmin();

  if (!barberId) return { ok: false, error: "Berber bulunamadı." };
  if (!Array.isArray(days) || days.length > 7)
    return { ok: false, error: "Geçersiz istek." };
  const invalid = validateDays(days);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Sil + yaz (Supabase JS'te transaction yok; doğrulama yukarıda yapıldığı
  // için insert'in DB kısıtına takılması beklenmez).
  const { error: delError } = await supabase
    .from("working_hours")
    .delete()
    .eq("barber_id", barberId);
  if (delError) {
    console.error("saveWorkingHours delete:", delError.message);
    return { ok: false, error: "Kaydedilemedi, tekrar deneyin." };
  }

  if (days.length > 0) {
    const { error: insError } = await supabase.from("working_hours").insert(
      days.map((d) => ({
        barber_id: barberId,
        weekday: d.weekday,
        start_time: d.start,
        end_time: d.end,
        break_start: d.breakStart || null,
        break_end: d.breakEnd || null,
      })),
    );
    if (insError) {
      console.error("saveWorkingHours insert:", insError.message);
      return {
        ok: false,
        error: "Kaydedilemedi — saatleri kontrol edip tekrar deneyin.",
      };
    }
  }

  // Vitrindeki saat tablosu, randevu takvimi ve panel takvimi etkilenir.
  revalidatePath("/admin/ayarlar/saatler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/admin/takvim");
  revalidatePath("/");
  revalidatePath("/randevu");
  return { ok: true };
}
