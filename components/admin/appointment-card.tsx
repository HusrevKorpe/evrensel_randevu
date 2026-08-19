import { CalendarDays, Clock, Phone, Star, StickyNote, UserX } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { buttonVariants } from "@/components/ui/button";
import { whatsappMessage } from "@/lib/notifications/whatsapp-templates";
import { formatClock, formatDateShort, telHref, waHref } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  // Duruma uygun hazır metinle WhatsApp linki (sunucuda kurulur, tıklanınca
  // müşterinin sohbeti berberin kendi WhatsApp'ında dolu olarak açılır).
  const waLink = waHref(
    a.customer_phone,
    whatsappMessage(a.status, {
      customerName: a.customer_name,
      serviceName: a.service_name,
      barberName: a.barber_name,
      startsAtISO: a.starts_at,
    }),
  );

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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={telHref(a.customer_phone)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand"
          >
            <Phone className="size-3.5" />
            {a.customer_phone}
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            title="Müşteriye WhatsApp'tan hazır mesaj yaz"
            className={cn(
              buttonVariants({ variant: "outline", size: "xs" }),
              "border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700",
              "dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400",
            )}
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp
          </a>
        </div>
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

/**
 * WhatsApp logosu. lucide-react marka ikonu içermediği için resmi glif tek
 * path olarak gömüldü; `currentColor` ile boyanır, boyutu className'den gelir.
 */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.488" />
    </svg>
  );
}
