"use server";

import { after } from "next/server";
import { verifyStatusToken } from "@/lib/notifications/approval-token";
import { resolveCustomerStatus } from "@/lib/booking/customer-status";
import { notifyCustomerCancelled } from "@/lib/notifications/appointments";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteSubscriptionByEndpoint,
  saveCustomerSubscription,
} from "@/lib/notifications/push-subscriptions";
import type { CustomerStatusView } from "@/types";

/**
 * MÜŞTERİ DURUM SORGUSU (server action) — takip sayfası birkaç saniyede bir
 * çağırır ("canlı" his). Girişe/oturuma değil, imzalı DURUM token'ına dayanır.
 *
 * Yan etki: randevu hâlâ `pending` ve süresi geçmişse okuma anında yumuşak
 * zaman aşımına düşürülür (resolveCustomerStatus içinde) → müşteri sonucu
 * anında görür.
 */

export type StatusResult =
  | { ok: true; view: CustomerStatusView }
  | { ok: false; code: "invalid" | "expired" | "notfound" };

export async function checkAppointmentStatus(token: string): Promise<StatusResult> {
  if (typeof token !== "string" || !token) {
    return { ok: false, code: "invalid" };
  }

  const check = verifyStatusToken(token);
  if (!check.ok) return { ok: false, code: check.reason };

  const view = await resolveCustomerStatus(check.appointmentId);
  if (!view) return { ok: false, code: "notfound" };

  return { ok: true, view };
}

// ── Müşteri kendi randevusunu iptal eder ─────────────────────────────────
//
// Yetki: durum sayfasıyla AYNI imzalı token. Token o TEK randevuya bağlı →
// müşteri yalnızca kendi randevusunu iptal edebilir. Girişe gerek yok.
// Yalnız aktif (pending/confirmed) ve GELECEK randevu iptal edilebilir; saati
// geçmiş/geçmişte kalan iptal edilmez (o durumda müşteri dükkânı arasın).

export type CancelResult =
  | { ok: true; view: CustomerStatusView }
  | {
      ok: false;
      code: "invalid" | "expired" | "notfound" | "too_late" | "not_active" | "error";
      message: string;
    };

export async function cancelOwnAppointment(token: string): Promise<CancelResult> {
  const check = verifyStatusToken(token);
  if (!check.ok) {
    return check.reason === "expired"
      ? { ok: false, code: "expired", message: "Bağlantının süresi dolmuş." }
      : { ok: false, code: "invalid", message: "Bağlantı geçersiz." };
  }

  const admin = createAdminClient();
  const { data: appt, error: readError } = await admin
    .from("appointments")
    .select("id, status, starts_at")
    .eq("id", check.appointmentId)
    .maybeSingle();

  if (readError) {
    console.error("cancelOwnAppointment read:", readError.message);
    return { ok: false, code: "error", message: "İptal edilemedi, tekrar dene." };
  }
  if (!appt) return { ok: false, code: "notfound", message: "Randevu bulunamadı." };

  // Zaten iptalse: idempotent — güncel görünümü döndür (hata gösterme).
  if (appt.status === "cancelled") {
    const view = await resolveCustomerStatus(check.appointmentId);
    return view
      ? { ok: true, view }
      : { ok: false, code: "notfound", message: "Randevu bulunamadı." };
  }
  // Yalnız bekleyen/onaylı randevu iptal edilebilir (tamamlandı/gelmedi olmaz).
  if (appt.status !== "pending" && appt.status !== "confirmed") {
    return { ok: false, code: "not_active", message: "Bu randevu artık iptal edilemez." };
  }
  // Saati geçmişse iptal etme — müşteri dükkânı arasın.
  if (new Date(appt.starts_at as string).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "too_late",
      message: "Randevu saati yaklaştığı/geçtiği için buradan iptal edilemez. Lütfen bizi arayın.",
    };
  }

  // İptal et — WHERE'e status şartı koy: bu arada onaylanmış/iptal olmuşsa
  // (yarış) 0 satır güncellenir, yanlışlıkla bildirim atmayız.
  const { data: updated, error } = await admin
    .from("appointments")
    .update({ status: "cancelled", cancel_reason: "customer" })
    .eq("id", check.appointmentId)
    .in("status", ["pending", "confirmed"])
    .select("id");

  if (error) {
    console.error("cancelOwnAppointment update:", error.message);
    return { ok: false, code: "error", message: "İptal edilemedi, tekrar dene." };
  }

  // 0 satır → durum bu arada değişti; güncel görünümü döndür (spam yok).
  if (!updated || updated.length === 0) {
    const view = await resolveCustomerStatus(check.appointmentId);
    return view
      ? { ok: true, view }
      : { ok: false, code: "notfound", message: "Randevu bulunamadı." };
  }

  // Berbere haber ver (yanıtı bekletme).
  after(() => notifyCustomerCancelled(check.appointmentId));

  const view = await resolveCustomerStatus(check.appointmentId);
  if (!view) return { ok: false, code: "notfound", message: "Randevu bulunamadı." };
  return { ok: true, view };
}

// ── Web Push aboneliği (müşteri) ─────────────────────────────────────────
//
// Yetki, durum sayfasındaki OKUMA yetkisiyle AYNI kaynaktan gelir: imzalı
// status token. Token o TEK randevuya bağlıdır → müşteri yalnızca kendi
// randevusuna abone olabilir. Kayıt service-role ile yapılır (tablo RLS'de
// anon'a kapalı), ama kapıyı token açar.

export async function savePushSubscription(
  token: string,
  sub: PushSubscriptionJSON,
): Promise<{ ok: boolean; error?: string }> {
  const check = verifyStatusToken(token);
  if (!check.ok) return { ok: false, error: "Bağlantı geçersiz." };
  return saveCustomerSubscription(check.appointmentId, sub);
}

export async function removePushSubscription(
  token: string,
  endpoint: string,
): Promise<void> {
  // Token geçersiz olsa bile ölü aboneliği temizlemek zararsız; yine de
  // yalnızca geçerli token'la silelim (yabancı endpoint silinmesin).
  const check = verifyStatusToken(token);
  if (!check.ok) return;
  if (typeof endpoint === "string" && endpoint) {
    await deleteSubscriptionByEndpoint(endpoint);
  }
}
