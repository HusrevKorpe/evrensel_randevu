import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeResponseDeadline,
  weeklyHoursFromRows,
  type WeeklyHours,
} from "@/lib/booking/response-deadline";
import {
  combineServiceNames,
  type ServiceJoinRow,
} from "@/lib/booking/service-names";
import type { AppointmentStatus, CustomerStatusView } from "@/types";

/**
 * MÜŞTERİ DURUM ÇÖZÜMÜ + ZAMAN AŞIMI SÜPÜRMESİ.
 *
 * Buradaki yazımlar ADMIN (service-role) istemciyle yapılır: müşteri girişi
 * yok, RLS anon'a randevu okutmaz/güncelletmez. Kapıyı imzalı token açar
 * (çağıran taraf doğrular), veriyi service-role çeker — `server-only` kalkanı
 * anahtarın istemciye sızmasını engeller.
 */

/** Gömülü ilişki dizi ya da nesne dönebilir; ilk kaydı güvenle çıkarır. */
function relOf<T>(rel: T | T[] | null): T | null {
  return !rel ? null : Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Bir berberin haftalık açık saatlerini çeker (deadline hesabı için). */
async function fetchWeeklyHours(barberId: string): Promise<WeeklyHours> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("working_hours")
    .select("weekday, start_time, end_time")
    .eq("barber_id", barberId);
  return weeklyHoursFromRows(data ?? []);
}

/** pending randevuyu YUMUŞAK zaman aşımıyla iptal eder (yalnızca hâlâ pending ise). */
async function expireOne(appointmentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("appointments")
    .update({ status: "cancelled", cancel_reason: "timeout" })
    .eq("id", appointmentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

/**
 * Bir randevunun müşteriye gösterilecek güncel durumunu döner.
 * `pending` ve süresi GEÇMİŞSE, okuma anında otomatik zaman aşımına düşürür
 * (tembel expire) → müşteri sayfayı açtığı an doğru sonucu görür, cron beklemez.
 */
export async function resolveCustomerStatus(
  appointmentId: string,
): Promise<CustomerStatusView | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, barber_id, created_at, starts_at, status, cancel_reason, service:services(name), service_items:appointment_services(services(name, sort_order)), barber:barbers(name)",
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("resolveCustomerStatus:", error.message);
    return null;
  }

  const service = relOf(data.service as { name: string } | { name: string }[] | null);
  const barber = relOf(data.barber as { name: string } | { name: string }[] | null);
  const serviceName = combineServiceNames(
    data.service_items as ServiceJoinRow[] | null,
    service?.name ?? "—",
  );

  let status = data.status as AppointmentStatus;
  let timedOut = status === "cancelled" && data.cancel_reason === "timeout";
  let deadlineISO: string | null = null;

  if (status === "pending") {
    const weekly = await fetchWeeklyHours(data.barber_id as string);
    const deadline = computeResponseDeadline({
      createdAtISO: data.created_at as string,
      startsAtISO: data.starts_at as string,
      weekly,
    });

    if (Date.now() > deadline.getTime()) {
      // Süre doldu → otomatik yumuşak iptal.
      if (await expireOne(appointmentId)) {
        status = "cancelled";
        timedOut = true;
      } else {
        // Yarış: bu arada usta yanıtlamış olabilir → taze durumu oku.
        const { data: fresh } = await admin
          .from("appointments")
          .select("status, cancel_reason")
          .eq("id", appointmentId)
          .maybeSingle();
        if (fresh) {
          status = fresh.status as AppointmentStatus;
          timedOut = status === "cancelled" && fresh.cancel_reason === "timeout";
        }
      }
    } else {
      deadlineISO = deadline.toISOString(); // hâlâ bekliyor: son anı göster
    }
  }

  return {
    status,
    timedOut,
    serviceName,
    barberName: barber?.name ?? "—",
    startsAtISO: data.starts_at as string,
    reference: (data.id as string).slice(0, 8).toUpperCase(),
    deadlineISO,
  };
}

/**
 * SÜPÜRME (cron yedeği): kimsenin izlemediği, süresi geçmiş pending randevuları
 * toplu zaman aşımına düşürür → slotları serbest kalır. Tembel-expire zaten
 * sayfayı AÇAN müşteri için anında çalışır; bu, açmayanları temizler.
 */
export async function expirePendingAppointments(): Promise<{
  expired: number;
  /** Zaman aşımına düşürülen randevu id'leri (müşteriye push atmak için). */
  ids: string[];
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select("id, barber_id, created_at, starts_at")
    .eq("status", "pending");

  if (error) {
    console.error("expirePendingAppointments:", error.message);
    return { expired: 0, ids: [] };
  }

  const rows = data ?? [];
  // Berber saatlerini berber başına BİR kez çek (tekrar tekrar sorgulama).
  const weeklyCache = new Map<string, WeeklyHours>();
  const toExpire: string[] = [];

  for (const row of rows) {
    const barberId = row.barber_id as string;
    let weekly = weeklyCache.get(barberId);
    if (!weekly) {
      weekly = await fetchWeeklyHours(barberId);
      weeklyCache.set(barberId, weekly);
    }
    const deadline = computeResponseDeadline({
      createdAtISO: row.created_at as string,
      startsAtISO: row.starts_at as string,
      weekly,
    });
    if (Date.now() > deadline.getTime()) toExpire.push(row.id as string);
  }

  if (toExpire.length === 0) return { expired: 0, ids: [] };

  const { data: updated, error: upErr } = await admin
    .from("appointments")
    .update({ status: "cancelled", cancel_reason: "timeout" })
    .in("id", toExpire)
    .eq("status", "pending")
    .select("id");

  if (upErr) {
    console.error("expirePendingAppointments update:", upErr.message);
    return { expired: 0, ids: [] };
  }
  const ids = (updated ?? []).map((r) => r.id as string);
  return { expired: ids.length, ids };
}
