"use server";

import { verifyStatusToken } from "@/lib/notifications/approval-token";
import { resolveCustomerStatus } from "@/lib/booking/customer-status";
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
