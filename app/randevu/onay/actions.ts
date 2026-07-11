"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { verifyApprovalToken } from "@/lib/notifications/approval-token";
import { notifyCancelled } from "@/lib/notifications/appointments";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mailden gelen berberin onay/red işlemi (server action).
 *
 * Burada oturum YOK — berber giriş yapmadı. Yetki, e-postadaki imzalı
 * token'dan gelir: imza doğrulanmadan hiçbir şey yapılmaz. Token yalnızca
 * TEK randevuyu, randevu saatine kadar yönetme yetkisi verir.
 *
 * DB yazımı admin (service-role) istemciyle yapılır çünkü RLS'de anon'un
 * güncelleme yetkisi yok — ve olmamalı; kapıyı token açar, RLS değil.
 */

export type RespondResult =
  | { ok: true; status: "confirmed" | "cancelled" }
  | { ok: false; code: "invalid" | "expired" | "already" | "error"; message: string };

export async function respondToAppointment(
  token: string,
  action: "onayla" | "reddet",
): Promise<RespondResult> {
  if (typeof token !== "string" || (action !== "onayla" && action !== "reddet")) {
    return { ok: false, code: "invalid", message: "Geçersiz istek." };
  }

  const check = verifyApprovalToken(token);
  if (!check.ok) {
    return check.reason === "expired"
      ? {
          ok: false,
          code: "expired",
          message: "Bu bağlantının süresi dolmuş — randevu saati geçmiş.",
        }
      : { ok: false, code: "invalid", message: "Bu bağlantı geçersiz." };
  }

  const status = action === "onayla" ? "confirmed" : "cancelled";
  const admin = createAdminClient();

  // Yalnızca hâlâ `pending` ise güncelle — iki kişi (veya mail + panel) aynı
  // anda işlem yaparsa ikincisi boş döner ve "zaten yanıtlanmış" deriz.
  const { data: updated, error } = await admin
    .from("appointments")
    .update({ status })
    .eq("id", check.appointmentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("respondToAppointment:", error.message);
    return { ok: false, code: "error", message: "İşlem yapılamadı, tekrar dene." };
  }
  if (!updated) {
    return {
      ok: false,
      code: "already",
      message: "Bu randevu zaten yanıtlanmış (panelden kontrol edebilirsin).",
    };
  }

  // Redde müşteriye iptal maili — yanıtı bekletmeden.
  if (status === "cancelled") {
    after(() => notifyCancelled(check.appointmentId));
  }

  // Panel ekranları taze veriyi görsün.
  revalidatePath("/admin/randevular");
  revalidatePath("/admin");
  revalidatePath("/admin/takvim");
  revalidatePath("/admin/gecmis");
  return { ok: true, status };
}
