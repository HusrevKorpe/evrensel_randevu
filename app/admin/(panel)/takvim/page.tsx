import type { Metadata } from "next";
import { CalendarOff } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  dayRangeUtc,
  getAppointmentsInRange,
  getCalendarHourBounds,
  type AdminAppointment,
} from "@/lib/admin/data";
import { getBarbers } from "@/lib/data";
import {
  SHOP_UTC_OFFSET,
  addDaysISO,
  mondayOf,
  shopDateTimeOf,
  shopLocalToUtc,
  shopNow,
} from "@/lib/booking/time";
import { formatDateLong } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { CalendarNav, type CalendarView } from "@/components/admin/calendar-nav";
import { CalendarGrid, type CalendarColumn } from "@/components/admin/calendar-grid";

export const metadata: Metadata = { title: "Takvim" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Pzt 6 Tem" gibi kısa sütun başlığı üretir. */
function shortDayHeading(dateISO: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${dateISO}T12:00:00${SHOP_UTC_OFFSET}`))
    .replace(".", "");
}

/** "6 – 12 Temmuz 2026" gibi hafta aralığı etiketi. */
function weekLabel(mondayISO: string): string {
  const sundayISO = addDaysISO(mondayISO, 6);
  const noon = (iso: string) => new Date(`${iso}T12:00:00${SHOP_UTC_OFFSET}`);
  const dayFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
  });
  const fullFmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${dayFmt.format(noon(mondayISO))} – ${fullFmt.format(noon(sundayISO))}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Bu ikisi searchParams'tan BAĞIMSIZ (tarihe/görünüme bakmaz) → en başta
  // ateşle; çözülmelerini beklerken aşağıdaki işler paralel ilerlesin.
  const authPromise = requireAdmin();
  const boundsPromise = getCalendarHourBounds();

  const sp = await searchParams;
  const today = shopNow().dateISO;
  const dateRaw = typeof sp.date === "string" ? sp.date : undefined;
  const date = dateRaw && DATE_RE.test(dateRaw) ? dateRaw : today;
  const view: CalendarView = sp.view === "gun" ? "gun" : "hafta";

  let columns: CalendarColumn[];
  let description: string;

  if (view === "hafta") {
    // ── HAFTA: Pazartesi–Pazar, her gün bir sütun ──
    const monday = mondayOf(date);
    const startISO = shopLocalToUtc(monday, "00:00").toISOString();
    const endISO = shopLocalToUtc(addDaysISO(monday, 7), "00:00").toISOString();
    const [appts] = await Promise.all([
      getAppointmentsInRange(startISO, endISO, [
        "pending",
        "confirmed",
        "completed",
        "no_show",
      ]),
      authPromise,
    ]);

    // Randevuları dükkan yerelindeki gününe göre grupla.
    const byDay = new Map<string, AdminAppointment[]>();
    for (const a of appts) {
      const day = shopDateTimeOf(a.starts_at).dateISO;
      const list = byDay.get(day);
      if (list) list.push(a);
      else byDay.set(day, [a]);
    }

    columns = Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(monday, i);
      return {
        key: iso,
        heading: shortDayHeading(iso),
        dateISO: iso,
        isToday: iso === today,
        appointments: byDay.get(iso) ?? [],
      };
    });
    description = weekLabel(monday);
  } else {
    // ── GÜN: her berber bir sütun (klasik kuaför defteri) ──
    const { startISO, endISO } = dayRangeUtc(date);
    const [appts, barbers] = await Promise.all([
      getAppointmentsInRange(startISO, endISO, [
        "pending",
        "confirmed",
        "completed",
        "no_show",
      ]),
      getBarbers(),
      authPromise,
    ]);

    // Pasif berberde randevu kalmış olabilir → sütunu yine de göster.
    const known = new Set(barbers.map((b) => b.id));
    const extras = new Map<string, string>();
    for (const a of appts) {
      if (!known.has(a.barber_id)) extras.set(a.barber_id, a.barber_name);
    }

    columns = [
      ...barbers.map((b) => ({ id: b.id, name: b.name })),
      ...[...extras].map(([id, name]) => ({ id, name })),
    ].map((b) => ({
      key: b.id,
      heading: b.name,
      dateISO: date,
      isToday: date === today,
      appointments: appts.filter((a) => a.barber_id === b.id),
    }));
    description = formatDateLong(startISO);
  }

  // En başta ateşlenmişti; bu noktada büyük ihtimalle çoktan hazır.
  const bounds = await boundsPromise;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Takvim" description={description} />
      <CalendarNav view={view} date={date} today={today} />

      {columns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
          <CalendarOff className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Gösterilecek berber yok.</p>
        </div>
      ) : (
        <CalendarGrid
          columns={columns}
          startMin={bounds.startMin}
          endMin={bounds.endMin}
        />
      )}
    </div>
  );
}
