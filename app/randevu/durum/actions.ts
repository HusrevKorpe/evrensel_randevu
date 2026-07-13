"use server";

import { verifyStatusToken } from "@/lib/notifications/approval-token";
import { resolveCustomerStatus } from "@/lib/booking/customer-status";
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
