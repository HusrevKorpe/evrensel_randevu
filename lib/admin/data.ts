import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import {
  combineServiceNames,
  type ServiceJoinRow,
} from "@/lib/booking/service-names";
import type {
  AppointmentStatus,
  BarberWithEmail,
  Service,
  TimeOff,
  WorkingHour,
} from "@/types";

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
  service_items: ServiceJoinRow[] | null;
  barber: { name: string } | { name: string }[] | null;
};

/** Gömülü ilişki bazen dizi bazen nesne döner; adı güvenle çıkarır. */
function nameOf(rel: Row["service"]): string {
  if (!rel) return "—";
  return Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;
}

/**
 * Randevu sorgularının ortak select'i.
 * `service` = birincil hizmet (yedek), `service_items` = seçilen TÜM hizmetler
 * (ara tablo) → adları birleştirilir. `barber` = usta adı.
 */
const APPOINTMENT_SELECT =
  "id, barber_id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, notes, service:services!appointments_service_id_fkey(name), service_items:appointment_services(services(name, sort_order)), barber:barbers(name)";

/** Ham satırı panel randevusuna çevirir (gömülü ilişkileri düzleştirir). */
function toAdminAppointment(r: Row): AdminAppointment {
  return {
    id: r.id,
    barber_id: r.barber_id,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    customer_email: r.customer_email,
    notes: r.notes,
    service_name: combineServiceNames(r.service_items, nameOf(r.service)),
    barber_name: nameOf(r.barber),
  };
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
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", startUtcISO)
    .lt("starts_at", endUtcISO)
    .order("starts_at", { ascending: true });

  if (statuses && statuses.length > 0) query = query.in("status", statuses);

  const { data, error } = await query;
  if (error) {
    console.error("getAppointmentsInRange:", error.message);
    return [];
  }

  return ((data ?? []) as Row[]).map(toAdminAppointment);
}

/**
 * ONAY BEKLEYEN (pending) tüm randevular — tarih fark etmeksizin, başlangıcı
 * şu andan SONRA olanlar, en yakından uzağa sıralı.
 *
 * Neden ayrı? Dashboard ve Randevular sayfası yalnızca "seçili günü" gösterir;
 * oysa onay bekleyen talepler çoğunlukla İLERİ tarihli. Berber e-posta alıp
 * panele girince, hangi güne ait olduğunu bilmeden hepsini tek yerde görüp
 * onaylayabilsin diye tarihten bağımsız çekilir.
 */
export async function getPendingAppointments(): Promise<AdminAppointment[]> {
  const supabase = await createClient();
  const nowISO = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("status", "pending")
    .gte("starts_at", nowISO)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("getPendingAppointments:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toAdminAppointment);
}

/** Bir telefon numarasının GEÇMİŞ randevu özeti (berbere karar sinyali). */
export type CustomerHistory = {
  /** Tamamlanmış (gelmiş) randevu sayısı → sadık/düzenli müşteri sinyali. */
  completed: number;
  /** "Gelmedi" işaretli randevu sayısı → riskli müşteri sinyali. */
  noShow: number;
  /** İptal edilmiş geçmiş randevu sayısı. */
  cancelled: number;
};

/**
 * Verilen telefon numaralarının GEÇMİŞ randevu istatistikleri (tek sorguda,
 * toplu). "Bu numara kaç kez geldi / kaç kez gelmedi" rozetini beslemek için.
 *
 * Yalnızca başlangıcı ŞU ANDAN ÖNCE olan randevular sayılır → değerlendirilen
 * randevunun kendisi (gelecek/bekleyen) sayıya KATILMAZ. Boş liste → boş Map.
 */
export async function getCustomerHistories(
  phones: string[],
): Promise<Map<string, CustomerHistory>> {
  const unique = [...new Set(phones)].filter(Boolean);
  const map = new Map<string, CustomerHistory>();
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const nowISO = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointments")
    .select("customer_phone, status")
    .in("customer_phone", unique)
    .lt("starts_at", nowISO);

  if (error) {
    console.error("getCustomerHistories:", error.message);
    return map;
  }

  for (const row of (data ?? []) as { customer_phone: string; status: AppointmentStatus }[]) {
    const h =
      map.get(row.customer_phone) ?? { completed: 0, noShow: 0, cancelled: 0 };
    if (row.status === "completed") h.completed++;
    else if (row.status === "no_show") h.noShow++;
    else if (row.status === "cancelled") h.cancelled++;
    map.set(row.customer_phone, h);
  }
  return map;
}

/**
 * GEÇMİŞ randevular: başlangıcı şu andan önce olan TÜM kayıtlar (iptal ve
 * gelmeyenler dahil), en yeniden eskiye, sayfalı.
 *
 * Sayfa numarası [1, sonSayfa] aralığına sabitlenir; bu yüzden dönen `page`
 * istenen değerden farklı olabilir (örn. elle ?page=999 yazıldıysa).
 * Sabitleme için önce toplam sayı çekilir — aralık toplamı aşarsa PostgREST
 * hata döndürdüğünden bu ayrıca bizi o hatadan da korur.
 */
export async function getPastAppointments(
  page: number,
  pageSize: number,
): Promise<{ items: AdminAppointment[]; total: number; page: number }> {
  const supabase = await createClient();
  const nowISO = new Date().toISOString();

  const { count, error: countError } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .lt("starts_at", nowISO);

  if (countError) {
    console.error("getPastAppointments count:", countError.message);
    return { items: [], total: 0, page: 1 };
  }

  const total = count ?? 0;
  if (total === 0) return { items: [], total: 0, page: 1 };

  const lastPage = Math.ceil(total / pageSize);
  const safePage = Math.min(Math.max(1, page), lastPage);
  const from = (safePage - 1) * pageSize;

  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .lt("starts_at", nowISO)
    .order("starts_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("getPastAppointments:", error.message);
    return { items: [], total, page: safePage };
  }

  return {
    items: ((data ?? []) as Row[]).map(toAdminAppointment),
    total,
    page: safePage,
  };
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

/**
 * TÜM berberler (pasifler dahil) + bildirim e-postaları.
 * `email` kolonu anon'a kapalı (0003 migration) ama burada girişli oturumun
 * RLS'li istemcisi var → authenticated rolü her kolonu okuyabilir.
 */
export async function getAllBarbersWithEmail(): Promise<BarberWithEmail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAllBarbersWithEmail:", error.message);
    return [];
  }
  return (data ?? []) as BarberWithEmail[];
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
