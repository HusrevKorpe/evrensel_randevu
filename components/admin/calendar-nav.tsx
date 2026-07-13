"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Columns3, Rows3, Undo2 } from "lucide-react";
import { addDaysISO } from "@/lib/booking/time";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarView = "hafta" | "gun";

/**
 * Takvim gezinmesi: hafta/gün görünüm anahtarı + ileri/geri + tarih + Bugün.
 * Durum URL'de tutulur (?view=&date=) → sayfa server'da veriyi ona göre çeker.
 * (Randevu listesindeki filtre deseninin aynısı.)
 */
export function CalendarNav({
  view,
  date,
  today,
}: {
  view: CalendarView;
  date: string;
  today: string;
}) {
  const router = useRouter();

  function go(nextDate: string, nextView: CalendarView) {
    const params = new URLSearchParams();
    params.set("date", nextDate);
    if (nextView !== "hafta") params.set("view", nextView);
    router.push(`/admin/takvim?${params.toString()}`);
  }

  const step = view === "hafta" ? 7 : 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* ── Görünüm anahtarı ── */}
      <div className="flex rounded-lg border border-border p-0.5">
        {(
          [
            { key: "hafta", label: "Hafta", icon: Columns3 },
            { key: "gun", label: "Gün", icon: Rows3 },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(date, key)}
            aria-pressed={view === key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              view === key
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tarih gezinme ── */}
      <Button
        variant="outline"
        size="icon"
        aria-label={view === "hafta" ? "Önceki hafta" : "Önceki gün"}
        onClick={() => go(addDaysISO(date, -step), view)}
      >
        <ChevronLeft />
      </Button>
      <input
        type="date"
        value={date}
        aria-label="Tarih seç"
        onChange={(e) => e.target.value && go(e.target.value, view)}
        className="h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20"
      />
      <Button
        variant="outline"
        size="icon"
        aria-label={view === "hafta" ? "Sonraki hafta" : "Sonraki gün"}
        onClick={() => go(addDaysISO(date, step), view)}
      >
        <ChevronRight />
      </Button>
      {date !== today && (
        <Button variant="outline" size="sm" onClick={() => go(today, view)}>
          <Undo2 />
          Bugüne dön
        </Button>
      )}
    </div>
  );
}
