import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  dayRangeUtc,
  getAppointmentsInRange,
  getCustomerHistories,
} from "@/lib/admin/data";
import { shopNow } from "@/lib/booking/time";
import { formatDateLong } from "@/lib/format";
import { STATUS_ORDER } from "@/lib/admin/status";
import { PageHeader } from "@/components/admin/page-header";
import {
  AppointmentFilters,
  type StatusFilter,
} from "@/components/admin/appointment-filters";
import { AppointmentCard } from "@/components/admin/appointment-card";
import type { AppointmentStatus } from "@/types";

export const metadata: Metadata = { title: "Randevular" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** URL'deki ?status değerini güvenle StatusFilter'a çevirir (geçersizse "all"). */
function parseStatus(v: string | undefined): StatusFilter {
  if (v && (STATUS_ORDER as string[]).includes(v)) return v as AppointmentStatus;
  return "all";
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Auth'u hemen ATEŞLE ama bekleme; searchParams çözülürken getUser
  // gidiş-dönüşü arka planda ilerlesin (aşağıda Promise.all ile toplarız).
  const authPromise = requireAdmin();

  const sp = await searchParams;
  const today = shopNow().dateISO;
  const dateRaw = typeof sp.date === "string" ? sp.date : undefined;
  const date = dateRaw && DATE_RE.test(dateRaw) ? dateRaw : today;
  const status = parseStatus(typeof sp.status === "string" ? sp.status : undefined);

  const { startISO, endISO } = dayRangeUtc(date);
  // Randevu sorgusu ile auth kontrolü paralel: biri diğerini beklemesin.
  const [all] = await Promise.all([
    getAppointmentsInRange(startISO, endISO), // tüm durumlar (iptaller dahil)
    authPromise,
  ]);

  const counts: Record<StatusFilter, number> = {
    all: all.length,
    pending: all.filter((a) => a.status === "pending").length,
    confirmed: all.filter((a) => a.status === "confirmed").length,
    completed: all.filter((a) => a.status === "completed").length,
    no_show: all.filter((a) => a.status === "no_show").length,
    cancelled: all.filter((a) => a.status === "cancelled").length,
  };

  const list = status === "all" ? all : all.filter((a) => a.status === status);

  // Listedeki telefonların geçmiş özeti (kaç kez geldi/gelmedi) — tek toplu sorgu.
  const histories = await getCustomerHistories(list.map((a) => a.customer_phone));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Randevular" description={formatDateLong(startISO)} />

      <AppointmentFilters
        date={date}
        status={status}
        counts={counts}
        today={today}
      />

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
          <CalendarX2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {counts.all === 0
              ? "Bu gün için randevu yok."
              : "Bu filtreye uyan randevu yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              showDate
              history={histories.get(a.customer_phone)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
