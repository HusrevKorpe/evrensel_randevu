import { CalendarDays, Clock, Phone, Star, StickyNote, UserX } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { formatClock, formatDateShort, telHref } from "@/lib/format";
import type { AdminAppointment, CustomerHistory } from "@/lib/admin/data";

/**
 * Tek bir randevunun detay kartı + duruma göre işlem butonları.
 *
 * `showDate`: kart tek bir güne ait listede değil de (ör. panelde "onay bekleyen"
 * karışık günler) gösteriliyorsa tarihi de yazar — yoksa yalnızca saat yeterli.
 * `history`: bu telefonun geçmiş özeti → "kaç kez geldi / gelmedi" rozetleri.
 */
export function AppointmentCard({
  appointment: a,
  showDate = false,
  history,
}: {
  appointment: AdminAppointment;
  showDate?: boolean;
  history?: CustomerHistory;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      {showDate && (
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand">
          <CalendarDays className="size-4" />
          {formatDateShort(a.starts_at)}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
          <Clock className="size-4 text-brand" />
          {formatClock(a.starts_at)}–{formatClock(a.ends_at)}
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{a.customer_name}</p>
          <CustomerHistoryBadges history={history} />
        </div>
        <p className="text-sm text-muted-foreground">
          {a.service_name} · {a.barber_name}
        </p>
        <a
          href={telHref(a.customer_phone)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand"
        >
          <Phone className="size-3.5" />
          {a.customer_phone}
        </a>
        {a.notes && (
          <p className="flex items-start gap-1.5 pt-1 text-sm text-muted-foreground">
            <StickyNote className="mt-0.5 size-3.5 shrink-0" />
            <span>{a.notes}</span>
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <AppointmentActions id={a.id} status={a.status} />
      </div>
    </article>
  );
}

/**
 * Müşteri geçmiş rozetleri: "N kez geldi" (sadık müşteri) ve "N kez gelmedi"
 * (riskli — berber onaylarken/karar verirken görsün). Geçmişi yoksa hiçbir şey
 * göstermez (ilk kez gelen müşteride kutu kalabalık olmasın).
 */
function CustomerHistoryBadges({ history }: { history?: CustomerHistory }) {
  if (!history) return null;
  const { completed, noShow } = history;
  if (completed === 0 && noShow === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {completed > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
          title={`Bu müşteri daha önce ${completed} kez geldi`}
        >
          <Star className="size-3" />
          {completed} kez geldi
        </span>
      )}
      {noShow > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
          title={`Bu numara daha önce ${noShow} kez gelmedi`}
        >
          <UserX className="size-3" />
          {noShow} kez gelmedi
        </span>
      )}
    </span>
  );
}
