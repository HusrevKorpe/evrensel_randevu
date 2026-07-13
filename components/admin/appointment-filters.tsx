"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { addDaysISO } from "@/lib/booking/time";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/admin/status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

/** "all" = tüm durumlar; diğerleri tek bir randevu durumu. */
export type StatusFilter = AppointmentStatus | "all";

/**
 * Randevu listesinin filtreleri: tarih gezinme (◀ tarih ▶ + Bugün) ve
 * durum çipleri. Filtre durumu URL'de (?date=&status=) tutulur → server
 * component onu okuyup veriyi çeker. Değişince `router.push` ile URL güncellenir.
 */
export function AppointmentFilters({
  date,
  status,
  counts,
  today,
}: {
  date: string;
  status: StatusFilter;
  counts: Record<StatusFilter, number>;
  today: string;
}) {
  const router = useRouter();

  function go(nextDate: string, nextStatus: StatusFilter) {
    const params = new URLSearchParams();
    params.set("date", nextDate);
    if (nextStatus !== "all") params.set("status", nextStatus);
    router.push(`/admin/randevular?${params.toString()}`);
  }

  const chips: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Tümü" },
    ...STATUS_ORDER.map((s) => ({ key: s as StatusFilter, label: STATUS_LABELS[s] })),
  ];

  return (
    <div className="space-y-3">
      {/* ── Tarih gezinme ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Önceki gün"
          onClick={() => go(addDaysISO(date, -1), status)}
        >
          <ChevronLeft />
        </Button>
        <input
          type="date"
          value={date}
          aria-label="Tarih seç"
          onChange={(e) => e.target.value && go(e.target.value, status)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Sonraki gün"
          onClick={() => go(addDaysISO(date, 1), status)}
        >
          <ChevronRight />
        </Button>
        {date !== today && (
          <Button variant="outline" size="sm" onClick={() => go(today, status)}>
            <Undo2 />
            Bugüne dön
          </Button>
        )}
      </div>

      {/* ── Durum filtresi ── */}
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ key, label }) => {
          const active = key === status;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(date, key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
              <span className="tabular-nums opacity-70">{counts[key]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
