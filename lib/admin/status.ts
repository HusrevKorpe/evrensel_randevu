import type { AppointmentStatus } from "@/types";

/**
 * Randevu durumlarının Türkçe etiketleri ve rozet (badge) renkleri.
 * Panel genelinde tutarlı görünsün diye TEK yerde tutulur.
 */

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
  no_show: "Gelmedi",
};

/** Rozet için Tailwind sınıfları (açık + koyu tema uyumlu). */
export const STATUS_BADGE: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  completed: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/15 text-destructive",
};

/** Panelde gösterim/filtre sırası. */
export const STATUS_ORDER: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
];
