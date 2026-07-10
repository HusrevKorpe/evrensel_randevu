"use client";

import { useState, useTransition } from "react";
import { Check, Coffee } from "lucide-react";
import {
  saveWorkingHours,
  type WorkingDayInput,
} from "@/app/admin/(panel)/ayarlar/saatler/actions";
import { Button } from "@/components/ui/button";
import { WEEKDAY_LABELS, WEEK_ORDER, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WorkingHour } from "@/types";

/**
 * Bir berberin haftalık çalışma saatleri düzenleyicisi.
 * Her gün: açık/kapalı anahtarı → açıksa saat aralığı + opsiyonel mola.
 * "Kaydet" tüm haftayı tek server action çağrısıyla yazar.
 */

type DayState = {
  open: boolean;
  start: string;
  end: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
};

const DEFAULT_DAY: Omit<DayState, "open"> = {
  start: "10:00",
  end: "20:00",
  hasBreak: false,
  breakStart: "13:00",
  breakEnd: "14:00",
};

function buildInitialState(rows: WorkingHour[]): Record<number, DayState> {
  const state: Record<number, DayState> = {};
  for (const wd of WEEK_ORDER) {
    const row = rows.find((r) => r.weekday === wd);
    state[wd] = row
      ? {
          open: true,
          start: formatTime(row.start_time),
          end: formatTime(row.end_time),
          hasBreak: row.break_start !== null,
          breakStart: row.break_start ? formatTime(row.break_start) : "13:00",
          breakEnd: row.break_end ? formatTime(row.break_end) : "14:00",
        }
      : { open: false, ...DEFAULT_DAY };
  }
  return state;
}

export function WorkingHoursEditor({
  barberId,
  barberName,
  initialHours,
}: {
  barberId: string;
  barberName: string;
  initialHours: WorkingHour[];
}) {
  const [days, setDays] = useState(() => buildInitialState(initialHours));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(wd: number, part: Partial<DayState>) {
    setSaved(false);
    setDays((prev) => ({ ...prev, [wd]: { ...prev[wd], ...part } }));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    const payload: WorkingDayInput[] = WEEK_ORDER.filter((wd) => days[wd].open).map(
      (wd) => ({
        weekday: wd,
        start: days[wd].start,
        end: days[wd].end,
        breakStart: days[wd].hasBreak ? days[wd].breakStart : null,
        breakEnd: days[wd].hasBreak ? days[wd].breakEnd : null,
      }),
    );
    startTransition(async () => {
      const res = await saveWorkingHours(barberId, payload);
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Bir hata oluştu.");
    });
  }

  const timeCls =
    "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="font-heading font-semibold">{barberName}</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              aria-live="polite"
            >
              <Check className="size-3.5" />
              Kaydedildi
            </span>
          )}
          <Button size="sm" disabled={pending} onClick={handleSave}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {WEEK_ORDER.map((wd) => {
          const d = days[wd];
          return (
            <li
              key={wd}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5",
                !d.open && "opacity-60",
              )}
            >
              <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={d.open}
                  onChange={(e) => patch(wd, { open: e.target.checked })}
                  className="size-4 accent-[var(--brand)]"
                />
                {WEEKDAY_LABELS[wd]}
              </label>

              {d.open ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={d.start}
                      aria-label={`${WEEKDAY_LABELS[wd]} açılış`}
                      onChange={(e) => patch(wd, { start: e.target.value })}
                      className={timeCls}
                    />
                    <span className="text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={d.end}
                      aria-label={`${WEEKDAY_LABELS[wd]} kapanış`}
                      onChange={(e) => patch(wd, { end: e.target.value })}
                      className={timeCls}
                    />
                  </span>

                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.hasBreak}
                      onChange={(e) => patch(wd, { hasBreak: e.target.checked })}
                      className="size-3.5 accent-[var(--brand)]"
                    />
                    <Coffee className="size-3.5" />
                    Mola
                  </label>

                  {d.hasBreak && (
                    <span className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={d.breakStart}
                        aria-label={`${WEEKDAY_LABELS[wd]} mola başlangıcı`}
                        onChange={(e) => patch(wd, { breakStart: e.target.value })}
                        className={timeCls}
                      />
                      <span className="text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={d.breakEnd}
                        aria-label={`${WEEKDAY_LABELS[wd]} mola bitişi`}
                        onChange={(e) => patch(wd, { breakEnd: e.target.value })}
                        className={timeCls}
                      />
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Kapalı</span>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="border-t border-border px-4 py-2.5 text-xs text-destructive sm:px-5" aria-live="polite">
          {error}
        </p>
      )}
    </section>
  );
}
