import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SLOT_STEP_MIN } from "@/lib/booking/config";
import {
  hhmmToMinutes,
  minutesToHHMM,
  shopLocalToUtc,
  shopNow,
  weekdayOf,
} from "@/lib/booking/time";

/**
 * BOŞ SLOT HESAPLAMA MOTORU — Faz 3'ün beyni.
 *
 * ⚠️ Neden ADMIN (service-role) istemci? Şemadaki RLS gereği ziyaretçi
 * (anon) `appointments` tablosunu OKUYAMAZ (müşteri gizliliği). Ama boş saati
 * bulmak için dolu randevuları görmek şart. Bu hesap YALNIZCA sunucuda döner,
 * service-role anahtarı asla istemciye sızmaz (`import "server-only"` kalkanı).
 *
 * Bir saat "boş" sayılır ancak ve ancak:
 *   • berberin o günkü çalışma penceresine sığıyor (başlangıç..bitiş),
 *   • öğle molasına denk gelmiyor,
 *   • (bugünse) geçmişte değil,
 *   • mevcut bir randevuyla çakışmıyor (iptaller hariç),
 *   • bir izin/kapalı aralığına denk gelmiyor (o berbere ait VEYA tüm dükkan).
 */

/** berberId → o gün boş olan "HH:MM" başlangıçları */
type FreeMap = Map<string, Set<string>>;

type BusyRange = { start: number; end: number }; // epoch ms

/**
 * Verilen gün + hizmet süresi için her aktif berberin boş başlangıç saatlerini
 * hesaplar. `onlyBarberId` verilirse sadece o berber; verilmezse hepsi
 * (sort_order sırasıyla — "Farketmez" ataması bu sırayı kullanır).
 */
async function computeFreeMap(
  dateISO: string,
  durationMin: number,
  onlyBarberId?: string,
): Promise<FreeMap> {
  const admin = createAdminClient();
  const weekday = weekdayOf(dateISO);

  // Güne değen randevu/izinleri çekmek için gün penceresi (UTC).
  const dayStart = shopLocalToUtc(dateISO, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // 1) Aktif berberler (sort_order sırasıyla)
  let barbersQuery = admin
    .from("barbers")
    .select("id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (onlyBarberId) barbersQuery = barbersQuery.eq("id", onlyBarberId);

  const { data: barbers } = await barbersQuery;
  const barberIds = (barbers ?? []).map((b) => b.id as string);
  const free: FreeMap = new Map(barberIds.map((id) => [id, new Set<string>()]));
  if (barberIds.length === 0) return free;

  // 2) O günün çalışma saatleri  3) o güne değen randevular  4) izinler
  //    — üçü birbirinden bağımsız, paralel çekelim.
  const [{ data: whRows }, { data: appts }, { data: offs }] = await Promise.all([
    admin
      .from("working_hours")
      .select("barber_id, start_time, end_time, break_start, break_end")
      .eq("weekday", weekday)
      .in("barber_id", barberIds),
    admin
      .from("appointments")
      .select("barber_id, starts_at, ends_at")
      .neq("status", "cancelled")
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString()),
    admin
      .from("time_off")
      .select("barber_id, starts_at, ends_at")
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString()),
  ]);

  const now = shopNow();
  const isToday = dateISO === now.dateISO;

  for (const row of whRows ?? []) {
    const barberId = row.barber_id as string;
    const set = free.get(barberId);
    if (!set) continue;

    const open = hhmmToMinutes(row.start_time);
    const close = hhmmToMinutes(row.end_time);
    const breakStart = row.break_start ? hhmmToMinutes(row.break_start) : null;
    const breakEnd = row.break_end ? hhmmToMinutes(row.break_end) : null;

    // Bu berberin o günkü meşgul aralıkları (randevu + kendine/dükkana ait izin).
    const busy: BusyRange[] = [];
    for (const a of appts ?? []) {
      if (a.barber_id !== barberId) continue;
      busy.push({
        start: new Date(a.starts_at).getTime(),
        end: new Date(a.ends_at).getTime(),
      });
    }
    for (const o of offs ?? []) {
      if (o.barber_id !== null && o.barber_id !== barberId) continue; // null = tüm dükkan
      busy.push({
        start: new Date(o.starts_at).getTime(),
        end: new Date(o.ends_at).getTime(),
      });
    }

    // Aday başlangıçları tara: hizmet süresi kapanışa sığmalı.
    for (let t = open; t + durationMin <= close; t += SLOT_STEP_MIN) {
      const slotEnd = t + durationMin;

      // Mola ile çakışma? [breakStart, breakEnd) yarı-açık aralık.
      if (breakStart !== null && breakEnd !== null && t < breakEnd && slotEnd > breakStart)
        continue;

      // Bugünse ve saat geçmişse gösterme.
      if (isToday && t <= now.minutes) continue;

      // Gerçek zaman aralığında randevu/izinle çakışma? [start, end) yarı-açık.
      const startMs = shopLocalToUtc(dateISO, minutesToHHMM(t)).getTime();
      const endMs = startMs + durationMin * 60 * 1000;
      const clashes = busy.some((b) => startMs < b.end && endMs > b.start);
      if (clashes) continue;

      set.add(minutesToHHMM(t));
    }
  }

  return free;
}

/**
 * Seçilen hizmetlerin TOPLAM süresini döner (randevu blok uzunluğu).
 * Tekrarlar ayıklanır. Liste boşsa ya da hizmetlerden biri yok/pasifse null
 * → çağıran taraf "uygun saat yok / geçersiz seçim" olarak ele alır.
 */
async function getServicesTotalDuration(
  serviceIds: string[],
): Promise<number | null> {
  const ids = [...new Set(serviceIds)];
  if (ids.length === 0) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("services")
    .select("id, duration_min, is_active")
    .in("id", ids);

  // Her istenen hizmet gerçekten var ve aktif olmalı.
  if (!data || data.length !== ids.length) return null;
  if (data.some((s) => !s.is_active)) return null;

  return data.reduce((sum, s) => sum + (s.duration_min as number), 0);
}

export type BarberChoice = string | "any";

/**
 * Bir gün + hizmet(ler) + berber(veya "any") için seçilebilir başlangıç saatleri.
 * "any" → herhangi bir aktif berberin boş olduğu saatlerin birleşimi.
 * Süre = seçilen tüm hizmetlerin toplamı (randevu blok uzunluğu).
 */
export async function getAvailableTimes(params: {
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
}): Promise<string[]> {
  const duration = await getServicesTotalDuration(params.serviceIds);
  if (!duration) return [];

  const free = await computeFreeMap(
    params.dateISO,
    duration,
    params.barberId === "any" ? undefined : params.barberId,
  );

  const union = new Set<string>();
  for (const set of free.values()) for (const time of set) union.add(time);
  return [...union].sort();
}

/**
 * Belirli bir slot için atanacak berberi seçer (çakışma anındaki son kontrol).
 * "any" → sort_order'a göre o saatte boş İLK berber. Boş yoksa null.
 */
export async function pickBarberForSlot(params: {
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
  time: string;
}): Promise<string | null> {
  const duration = await getServicesTotalDuration(params.serviceIds);
  if (!duration) return null;

  const free = await computeFreeMap(
    params.dateISO,
    duration,
    params.barberId === "any" ? undefined : params.barberId,
  );

  // Map, berberleri sort_order sırasıyla tutar → ilk boş berberi seçeriz.
  for (const [barberId, set] of free) {
    if (set.has(params.time)) return barberId;
  }
  return null;
}
