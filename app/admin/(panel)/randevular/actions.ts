"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth/dal";
import { notifyStatusChange } from "@/lib/notifications/appointments";
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

  // Onay/iptalde müşteriye e-posta (yanıtı bekletmeden, `after` ile).
  // Tamamlandı/gelmedi için e-posta atmayız — müşteri zaten dükkandaydı.
  if (status === "confirmed" || status === "cancelled") {
    after(() => notifyStatusChange(id, status));
  }

  // Değişiklik hem listede hem dashboard özetinde hem takvimde görünsün.
  revalidatePath("/admin/randevular");
  revalidatePath("/admin");
  revalidatePath("/admin/takvim");
  return { ok: true };
}
