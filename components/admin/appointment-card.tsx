import { Clock, Phone, StickyNote } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { formatClock, telHref } from "@/lib/format";
import type { AdminAppointment } from "@/lib/admin/data";

/** Tek bir randevunun detay kartı + duruma göre işlem butonları. */
export function AppointmentCard({ appointment: a }: { appointment: AdminAppointment }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
          <Clock className="size-4 text-brand" />
          {formatClock(a.starts_at)}–{formatClock(a.ends_at)}
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="mt-3 space-y-1">
        <p className="font-medium">{a.customer_name}</p>
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
