import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_LABELS } from "@/lib/admin/status";
import type { AppointmentStatus } from "@/types";

/** Randevu durumunu renkli bir rozet olarak gösterir. */
export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
