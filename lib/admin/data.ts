import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import type { AppointmentStatus, Service, TimeOff, WorkingHour } from "@/types";

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
  barber_id: string;
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
      "id, barber_id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(name)",
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
    barber_id: r.barber_id,
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
 * Takvim ızgarasının dikey saat sınırları: tüm çalışma saatlerinin
 * en erken açılışı ve en geç kapanışı (tam saate yuvarlanır).
 * Hiç satır yoksa 09:00–21:00 varsayılır.
 */
export async function getCalendarHourBounds(): Promise<{
  startMin: number;
  endMin: number;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_hours")
    .select("start_time, end_time");

  const rows = (error || !data ? [] : data) as {
    start_time: string;
    end_time: string;
  }[];
  if (error) console.error("getCalendarHourBounds:", error.message);
  if (rows.length === 0) return { startMin: 9 * 60, endMin: 21 * 60 };

  const toMin = (t: string) => {
    const [h, m] = t.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const min = Math.min(...rows.map((r) => toMin(r.start_time)));
  const max = Math.max(...rows.map((r) => toMin(r.end_time)));
  return {
    startMin: Math.floor(min / 60) * 60,
    endMin: Math.ceil(max / 60) * 60,
  };
}

// ── Ayarlar sayfalarının veri fonksiyonları ──────────────────────────────

/** TÜM hizmetler (pasifler dahil), sıra numarasına göre. Vitrindeki
 *  getServices'ten farkı: yönetim ekranında pasifler de listelenir. */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAllServices:", error.message);
    return [];
  }
  return (data ?? []) as Service[];
}

/** Tüm çalışma saati satırları (berber+gün bazında). */
export async function getAllWorkingHours(): Promise<WorkingHour[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_hours")
    .select("*")
    .order("weekday", { ascending: true });

  if (error) {
    console.error("getAllWorkingHours:", error.message);
    return [];
  }
  return (data ?? []) as WorkingHour[];
}

/** İzin kaydı + berber adı ("Tüm dükkan" için null). */
export type AdminTimeOff = TimeOff & { barber_name: string | null };

/** Henüz bitmemiş (devam eden + gelecek) izinler, başlangıca göre sıralı. */
export async function getUpcomingTimeOff(): Promise<AdminTimeOff[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("*, barber:barbers(name)")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("getUpcomingTimeOff:", error.message);
    return [];
  }

  type Row = TimeOff & { barber: { name: string } | { name: string }[] | null };
  return ((data ?? []) as Row[]).map(({ barber, ...t }) => ({
    ...t,
    barber_name: barber
      ? Array.isArray(barber)
        ? (barber[0]?.name ?? null)
        : barber.name
      : null,
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
