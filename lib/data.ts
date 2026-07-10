import "server-only";
import { createClient } from "@/lib/supabase/server";
import { WEEK_ORDER, WEEKDAY_LABELS, formatTime } from "@/lib/format";
import type { Barber, Service } from "@/types";

/**
 * Bu dosya sadece SUNUCU tarafında çalışır (`server-only`).
 * Vitrinin ihtiyaç duyduğu herkese açık verileri Supabase'den çeker.
 * RLS'de bu tablolar "public read" olduğundan anon istemci yeterlidir.
 *
 * Not: Her fonksiyon hata durumunda BOŞ dizi döner — DB'ye ulaşılamasa
 * bile sayfa çökmez, sadece ilgili bölüm boş görünür.
 */

/** Aktif hizmetler, sıra numarasına göre. */
export async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getServices:", error.message);
    return [];
  }
  return (data ?? []) as Service[];
}

/** Aktif berberler/personel, sıra numarasına göre. */
export async function getBarbers(): Promise<Barber[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getBarbers:", error.message);
    return [];
  }
  return (data ?? []) as Barber[];
}

/** Dükkanın bir günkü açık/kapalı durumu ve saat aralığı. */
export type ShopDay = {
  weekday: number;
  label: string;
  open: boolean;
  start: string | null;
  end: string | null;
};

/**
 * Dükkanın haftalık açılış-kapanış saatleri.
 * working_hours berber+gün bazında tutulur; vitrinde DÜKKAN saatini
 * göstermek için tüm berberlerin birleşimini alıyoruz:
 * en erken açılış → en geç kapanış. Hiç satır yoksa o gün kapalı.
 */
export async function getShopHours(): Promise<ShopDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_hours")
    .select("weekday, start_time, end_time");

  if (error) console.error("getShopHours:", error.message);

  const rows = (error || !data ? [] : data) as {
    weekday: number;
    start_time: string;
    end_time: string;
  }[];

  return WEEK_ORDER.map((weekday) => {
    const dayRows = rows.filter((r) => r.weekday === weekday);
    if (dayRows.length === 0) {
      return {
        weekday,
        label: WEEKDAY_LABELS[weekday],
        open: false,
        start: null,
        end: null,
      };
    }
    const start = dayRows.reduce(
      (min, r) => (r.start_time < min ? r.start_time : min),
      dayRows[0].start_time,
    );
    const end = dayRows.reduce(
      (max, r) => (r.end_time > max ? r.end_time : max),
      dayRows[0].end_time,
    );
    return {
      weekday,
      label: WEEKDAY_LABELS[weekday],
      open: true,
      start: formatTime(start),
      end: formatTime(end),
    };
  });
}

/** Bugünün gün indeksi (0=Pazar..6=Cumartesi), İstanbul saatine göre. */
export function getTodayWeekday(): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? new Date().getDay();
}
