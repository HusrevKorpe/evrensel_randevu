import Link from "next/link";
import { STATUS_BLOCK, STATUS_LABELS, STATUS_ORDER } from "@/lib/admin/status";
import { shopDateTimeOf, shopNow } from "@/lib/booking/time";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminAppointment } from "@/lib/admin/data";

/**
 * TAKVİM IZGARASI — sunucuda render edilir (etkileşim yok, sadece linkler).
 *
 * Dikey eksen = saat (1 dakika = 1px). Her sütun bir "gün" (hafta görünümü)
 * veya bir "berber" (gün görünümü). Randevu blokları, dükkan yereline
 * çevrilmiş başlangıç/bitiş dakikalarına göre mutlak konumlandırılır.
 * Bloka tıklayınca o günün randevu listesine gider (işlemler orada).
 */

const PX_PER_MIN = 1;

export type CalendarColumn = {
  key: string;
  /** Sütun başlığı: hafta görünümünde "Pzt 6 Tem", gün görünümünde berber adı. */
  heading: string;
  /** Blokların tıklayınca gideceği günün tarihi. */
  dateISO: string;
  isToday: boolean;
  appointments: AdminAppointment[];
};

type Block = {
  appt: AdminAppointment;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
};

/**
 * Aynı sütunda çakışan blokları yan yana şeritlere (lane) dağıtır.
 * Açgözlü yaklaşım: başlangıca göre sırala, boşalan ilk şeride yerleştir.
 * (Hafta görünümünde iki berberin aynı saatteki randevuları böyle yan yana durur.)
 */
function layoutBlocks(
  appts: AdminAppointment[],
  gridStartMin: number,
  gridEndMin: number,
): Block[] {
  const items = appts
    .map((appt) => {
      const start = shopDateTimeOf(appt.starts_at).minutes;
      const end = start + Math.max(
        15, // çok kısa randevular da okunabilir kalsın
        Math.round(
          (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) /
            60_000,
        ),
      );
      return {
        appt,
        start: Math.max(start, gridStartMin),
        end: Math.min(end, gridEndMin),
      };
    })
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Şerit ataması: her blok, bitiş zamanı geçmiş ilk şeride girer.
  const laneEnds: number[] = [];
  const laned = items.map((b) => {
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(b.end);
    } else {
      laneEnds[lane] = b.end;
    }
    return { ...b, lane };
  });

  // Çakışma kümesindeki toplam şerit sayısı = genişlik paydası.
  return laned.map((b) => {
    const overlapping = laned.filter((o) => o.start < b.end && o.end > b.start);
    const laneCount = Math.max(...overlapping.map((o) => o.lane)) + 1;
    return {
      appt: b.appt,
      top: (b.start - gridStartMin) * PX_PER_MIN,
      height: (b.end - b.start) * PX_PER_MIN,
      lane: b.lane,
      laneCount,
    };
  });
}

export function CalendarGrid({
  columns,
  startMin,
  endMin,
}: {
  columns: CalendarColumn[];
  startMin: number;
  endMin: number;
}) {
  const bodyHeight = (endMin - startMin) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = startMin; m <= endMin; m += 60) hours.push(m);

  const now = shopNow();
  const nowVisible = now.minutes > startMin && now.minutes < endMin;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-fit"
          style={{
            gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(8.5rem, 1fr))`,
          }}
        >
          {/* ── Başlık satırı ── */}
          <div className="border-b border-border" />
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "border-b border-l border-border px-2 py-2 text-center text-sm font-medium",
                col.isToday && "bg-brand/5 text-brand",
              )}
            >
              {col.heading}
            </div>
          ))}

          {/* ── Saat etiketleri sütunu ── */}
          <div className="relative" style={{ height: bodyHeight }}>
            {hours.map((m) => (
              <span
                key={m}
                className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground tabular-nums"
                style={{ top: (m - startMin) * PX_PER_MIN }}
              >
                {`${String(Math.floor(m / 60)).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {/* ── Gün / berber sütunları ── */}
          {columns.map((col) => {
            const blocks = layoutBlocks(col.appointments, startMin, endMin);
            return (
              <div
                key={col.key}
                className={cn(
                  "relative border-l border-border",
                  col.isToday && "bg-brand/5",
                )}
                style={{ height: bodyHeight }}
              >
                {/* Saat çizgileri */}
                {hours.slice(1).map((m) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: (m - startMin) * PX_PER_MIN }}
                    aria-hidden
                  />
                ))}

                {/* Şu an çizgisi (bugün sütununda) */}
                {col.isToday && nowVisible && (
                  <div
                    className="absolute inset-x-0 z-10 border-t-2 border-red-500"
                    style={{ top: (now.minutes - startMin) * PX_PER_MIN }}
                    aria-hidden
                  />
                )}

                {/* Randevu blokları */}
                {blocks.map(({ appt, top, height, lane, laneCount }) => (
                  <Link
                    key={appt.id}
                    href={`/admin/randevular?date=${col.dateISO}`}
                    title={`${formatClock(appt.starts_at)}–${formatClock(appt.ends_at)} · ${appt.customer_name} · ${appt.service_name} · ${appt.barber_name}`}
                    className={cn(
                      "absolute overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[11px] leading-tight transition-colors",
                      STATUS_BLOCK[appt.status],
                    )}
                    style={{
                      top: top + 1,
                      height: Math.max(height - 2, 14),
                      left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                      width: `calc(${100 / laneCount}% - 4px)`,
                    }}
                  >
                    <span className="font-mono font-semibold tabular-nums">
                      {formatClock(appt.starts_at)}
                    </span>{" "}
                    <span className="font-medium">{appt.customer_name}</span>
                    {height >= 38 && (
                      <span className="block truncate opacity-80">
                        {appt.service_name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Renk lejantı ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5">
        {STATUS_ORDER.filter((s) => s !== "cancelled").map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className={cn("size-2.5 rounded-sm border-l-2", STATUS_BLOCK[s])}
              aria-hidden
            />
            {STATUS_LABELS[s]}
          </span>
        ))}
        <span className="text-xs text-muted-foreground/70">
          İptaller takvimde gösterilmez.
        </span>
      </div>
    </div>
  );
}
