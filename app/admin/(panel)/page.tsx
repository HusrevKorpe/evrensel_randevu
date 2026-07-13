import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarDays, ChevronRight, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  dayRangeUtc,
  getAppointmentsInRange,
  getPendingAppointments,
} from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentCard } from "@/components/admin/appointment-card";
import { StaffPush } from "@/components/admin/staff-push";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatClock, formatDateLong } from "@/lib/format";

export const metadata: Metadata = { title: "Panel" };

/**
 * Dashboard: bugünün randevuları özeti.
 * requireAdmin() burada da çağrılır (layout guard'a EK katman) — auth kontrolünü
 * veriye en yakın yerde tekrarlamak Next.js'in önerdiği güvenli yaklaşım.
 */
export default async function DashboardPage() {
  const { startISO, endISO } = dayRangeUtc(); // bugün (İstanbul)

  // Auth kontrolü, bugünün özeti ve "onay bekleyen (tüm günler)" listesi
  // birbirinden BAĞIMSIZ → sırayla beklemek yerine PARALEL çalıştır.
  // Giriş yoksa requireAdmin yönlendirir → veri hiç render edilmez, sızıntı olmaz.
  const [, all, pending] = await Promise.all([
    requireAdmin(),
    getAppointmentsInRange(startISO, endISO),
    getPendingAppointments(),
  ]);
  const active = all.filter((a) => a.status !== "cancelled");

  const counts = {
    total: active.length,
    pending: active.filter((a) => a.status === "pending").length,
    confirmed: active.filter((a) => a.status === "confirmed").length,
    completed: active.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Panel"
        description={`Bugün — ${formatDateLong(startISO)}`}
        action={
          <Link
            href="/admin/randevular"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Tüm randevular
            <ChevronRight className="size-4" />
          </Link>
        }
      />

      <StaffPush />

      {/* ONAY BEKLEYEN — tarih fark etmeksizin tüm pending talepler. Berberin
          panele girince yapması gereken 1 numaralı iş, o yüzden en üstte. */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-brand" />
            <h2 className="font-heading font-semibold">Onay bekleyen randevular</h2>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand tabular-nums">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((a) => (
              <AppointmentCard key={a.id} appointment={a} showDate />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Bugün toplam" value={counts.total} />
        <StatCard label="Bekleyen" value={counts.pending} accent />
        <StatCard label="Onaylı" value={counts.confirmed} />
        <StatCard label="Tamamlanan" value={counts.completed} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          <CalendarDays className="size-4 text-brand" />
          <h2 className="font-heading font-semibold">Bugünün Randevuları</h2>
        </div>

        {active.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground sm:px-5">
            Bugün için randevu yok.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
              >
                <span className="flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatClock(a.starts_at)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service_name} · {a.barber_name}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p
        className={`text-2xl font-bold tabular-nums ${accent && value > 0 ? "text-brand" : ""}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
