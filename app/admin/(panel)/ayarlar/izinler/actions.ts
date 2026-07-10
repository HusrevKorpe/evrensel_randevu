"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * İzin / kapalı gün server action'ları.
 *
 * İzin eklemek randevuları OTOMATİK iptal etmez (bilerek — belki berber
 * müşteriyi arayıp taşıyacak). Bunun yerine aralıkla çakışan aktif randevu
 * sayısını döneriz; arayüz berberi uyarır.
 */

export type TimeOffActionResult =
  | { ok: true; overlapCount: number }
  | { ok: false; error: string };

export type TimeOffInput = {
  barberId: string | null; // null = tüm dükkan kapalı
  startsAtISO: string; // UTC ISO
  endsAtISO: string;
  reason: string;
};

const MAX_RANGE_DAYS = 90;

export async function createTimeOff(
  input: TimeOffInput,
): Promise<TimeOffActionResult> {
  await requireAdmin();

  const starts = new Date(input.startsAtISO);
  const ends = new Date(input.endsAtISO);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()))
    return { ok: false, error: "Geçersiz tarih." };
  if (ends <= starts)
    return { ok: false, error: "Bitiş, başlangıçtan sonra olmalı." };
  if (ends.getTime() - starts.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000)
    return { ok: false, error: `İzin aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir.` };
  if (ends.getTime() < Date.now())
    return { ok: false, error: "Tamamen geçmişte kalan bir izin eklenemez." };
  if ((input.reason ?? "").length > 200)
    return { ok: false, error: "Açıklama en fazla 200 karakter olabilir." };

  const supabase = await createClient();
  const { error } = await supabase.from("time_off").insert({
    barber_id: input.barberId || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    reason: input.reason.trim() || null,
  });

  if (error) {
    if (error.code === "23503") return { ok: false, error: "Berber bulunamadı." };
    console.error("createTimeOff:", error.message);
    return { ok: false, error: "İzin eklenemedi, tekrar deneyin." };
  }

  // Aralıkla çakışan aktif randevular — otomatik iptal YOK, sadece uyarı.
  let overlapQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", ends.toISOString())
    .gt("ends_at", starts.toISOString());
  if (input.barberId) overlapQuery = overlapQuery.eq("barber_id", input.barberId);

  const { count, error: countError } = await overlapQuery;
  if (countError) console.error("createTimeOff overlap:", countError.message);

  revalidatePath("/admin/ayarlar/izinler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/randevu");
  return { ok: true, overlapCount: count ?? 0 };
}

export async function deleteTimeOff(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Kayıt bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.from("time_off").delete().eq("id", id);

  if (error) {
    console.error("deleteTimeOff:", error.message);
    return { ok: false, error: "İzin silinemedi, tekrar deneyin." };
  }

  revalidatePath("/admin/ayarlar/izinler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/randevu");
  return { ok: true };
}
