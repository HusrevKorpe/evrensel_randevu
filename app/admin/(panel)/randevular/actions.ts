"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { notifyCancelled, notifyConfirmed } from "@/lib/notifications/appointments";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types";

/**
 * Randevu durumu değiştirme (server action).
 *
 * Güvenlik: server action'lar UI dışından da çağrılabilir → `requireAdmin()`
 * ile burada TEKRAR doğrularız (proxy + layout guard'a ek katman).
 *
 * Yetki: giriş yapmış berberin oturum çerezi RLS'de "authenticated" sayılır,
 * `admin manage appointments` politikası güncellemeye izin verir → service-role
 * anahtarına gerek yok (en az yetki ilkesi).
 */

const VALID_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

export type StatusActionResult = { ok: boolean; error?: string };

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<StatusActionResult> {
  await requireAdmin();

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Randevu bulunamadı." };
  }
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Geçersiz durum." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) {
    // 23P01 = exclusion_violation → iptal edilmiş bir randevuyu geri alırken
    // o saat başka aktif randevuyla dolmuşsa DB engeller. Kullanıcıya açık söyle.
    if (error.code === "23P01") {
      return { ok: false, error: "Bu saat başka bir randevuyla dolu." };
    }
    console.error("updateAppointmentStatus:", error.message);
    return { ok: false, error: "Güncellenemedi, tekrar deneyin." };
  }

  // Müşteriye YALNIZCA iptalde e-posta gider (Faz 7 kararı) — boşuna dükkana
  // gelmesin. Onayda mail yok; ama izin vermiş müşteriye PUSH ile "onaylandı"
  // bildirimi düşer. `after` ile yanıtı bekletmeden gönderilir.
  if (status === "cancelled") {
    after(() => notifyCancelled(id));
  } else if (status === "confirmed") {
    after(() => notifyConfirmed(id));
  }

  // Değişiklik listede, dashboard özetinde, takvimde ve geçmişte görünsün.
  revalidatePath("/admin/randevular");
  revalidatePath("/admin");
  revalidatePath("/admin/takvim");
  revalidatePath("/admin/gecmis");
  return { ok: true };
}
