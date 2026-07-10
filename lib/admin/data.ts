import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import type { AppointmentStatus } from "@/types";

/**
 * Admin panelinin veri katmanı — SADECE sunucu.
 *
 * Neden anon/server istemci (admin/service-role DEĞİL)? Çünkü burada
 * girişli berberin oturum çerezi var → RLS'de "authenticated" sayılır ve
 * `admin manage appointments` politikası tüm randevuları görmesine izin verir.
 * Yani service-role anahtarına gerek yok; en az yetkiyle çalışmak daha güvenli.
 */

/** Panelde gösterilen, servis/berber adı eklenmiş randevu. */
export type AdminAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  service_name: string;
  barber_name: string;
};

/** Supabase gömülü select'ten dönen ham satır tipi. */
type Row = Omit<AdminAppointment, "service_name" | "barber_name"> & {
  service: { name: string } | { name: string }[] | null;
  barber: { name: string } | { name: string }[] | null;
};

/** Gömülü ilişki bazen dizi bazen nesne döner; adı güvenle çıkarır. */
function nameOf(rel: Row["service"]): string {
  if (!rel) return "—";
  return Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;
}

/**
 * Başlangıcı [startUtcISO, endUtcISO) aralığında olan randevular, saate göre sıralı.
 * `statuses` verilirse yalnızca o durumlar; verilmezse (iptaller dahil) hepsi.
 */
export async function getAppointmentsInRange(
  startUtcISO: string,
  endUtcISO: string,
  statuses?: AppointmentStatus[],
): Promise<AdminAppointment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(name)",
    )
    .gte("starts_at", startUtcISO)
    .lt("starts_at", endUtcISO)
    .order("starts_at", { ascending: true });

  if (statuses && statuses.length > 0) query = query.in("status", statuses);

  const { data, error } = await query;
  if (error) {
    console.error("getAppointmentsInRange:", error.message);
    return [];
  }

  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    customer_email: r.customer_email,
    notes: r.notes,
    service_name: nameOf(r.service),
    barber_name: nameOf(r.barber),
  }));
}

/**
 * Dükkan yerel gününün UTC sınırlarını verir.
 * @param dateISO "YYYY-MM-DD" (verilmezse bugün, İstanbul'a göre)
 */
export function dayRangeUtc(dateISO?: string): {
  dateISO: string;
  startISO: string;
  endISO: string;
} {
  const day = dateISO ?? shopNow().dateISO;
  const start = shopLocalToUtc(day, "00:00");
  const end = shopLocalToUtc(addDaysISO(day, 1), "00:00");
  return { dateISO: day, startISO: start.toISOString(), endISO: end.toISOString() };
}
