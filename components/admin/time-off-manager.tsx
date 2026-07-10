"use client";

import { useState, useTransition } from "react";
import { CalendarOff, Plus, Store, Trash2, TriangleAlert, User } from "lucide-react";
import {
  createTimeOff,
  deleteTimeOff,
} from "@/app/admin/(panel)/ayarlar/izinler/actions";
import { Button } from "@/components/ui/button";
import { addDaysISO, shopDateTimeOf, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import { formatClock, formatDateLong } from "@/lib/format";
import type { AdminTimeOff } from "@/lib/admin/data";

/**
 * İzin / kapalı gün yönetimi: ekleme formu + yaklaşan izinler listesi.
 *
 * "Tüm gün" modunda sadece tarih seçilir; aralık dükkan yerelinde
 * [başlangıç 00:00, bitiş+1 00:00) olarak kaydedilir. Saatli modda
 * datetime-local kullanılır. Her iki mod da UTC ISO'ya çevrilip gönderilir.
 */

export function TimeOffManager({
  barbers,
  entries,
}: {
  barbers: { id: string; name: string }[];
  entries: AdminTimeOff[];
}) {
  const today = shopNow().dateISO;

  const [adding, setAdding] = useState(false);
  const [scope, setScope] = useState(""); // "" = tüm dükkan
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startAt, setStartAt] = useState(`${today}T10:00`);
  const [endAt, setEndAt] = useState(`${today}T12:00`);
  const [reason, setReason] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function resetForm() {
    setScope("");
    setAllDay(true);
    setStartDate(today);
    setEndDate(today);
    setStartAt(`${today}T10:00`);
    setEndAt(`${today}T12:00`);
    setReason("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);

    let startsAtISO: string;
    let endsAtISO: string;
    if (allDay) {
      startsAtISO = shopLocalToUtc(startDate, "00:00").toISOString();
      endsAtISO = shopLocalToUtc(addDaysISO(endDate, 1), "00:00").toISOString();
    } else {
      const [sd, st] = startAt.split("T");
      const [ed, et] = endAt.split("T");
      if (!sd || !st || !ed || !et) {
        setError("Tarih ve saatleri doldur.");
        return;
      }
      startsAtISO = shopLocalToUtc(sd, st).toISOString();
      endsAtISO = shopLocalToUtc(ed, et).toISOString();
    }

    startTransition(async () => {
      const res = await createTimeOff({
        barberId: scope || null,
        startsAtISO,
        endsAtISO,
        reason,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAdding(false);
      resetForm();
      if (res.overlapCount > 0) {
        setWarning(
          `Dikkat: bu aralıkta ${res.overlapCount} aktif randevu var. ` +
            "Gerekiyorsa Randevular sayfasından iptal et ve müşterilere haber ver.",
        );
      }
    });
  }

  function handleDelete(t: AdminTimeOff) {
    if (!window.confirm("Bu izin kaydı silinsin mi?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTimeOff(t.id);
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
    });
  }

  const inputCls =
    "rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20";

  return (
    <div className="space-y-4">
      {/* ── Ekleme formu ── */}
      {adding ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-brand/40 bg-card p-4 sm:p-5"
        >
          <h2 className="font-heading text-sm font-semibold">Yeni İzin / Kapalı Gün</h2>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Kim için?
              </span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className={inputCls}
              >
                <option value="">Tüm dükkan</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              Tüm gün
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {allDay ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    İlk gün
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    required
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    Son gün (dahil)
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    required
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    Başlangıç
                  </span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    required
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    Bitiş
                  </span>
                  <input
                    type="datetime-local"
                    value={endAt}
                    required
                    min={startAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={inputCls}
                  />
                </label>
              </>
            )}

            <label className="block min-w-40 flex-1">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Açıklama
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder="Örn. Bayram tatili (opsiyonel)"
                className={`${inputCls} w-full`}
              />
            </label>
          </div>

          {error && (
            <p className="text-xs text-destructive" aria-live="polite">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Ekleniyor…" : "Ekle"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus />
          Yeni İzin
        </Button>
      )}

      {warning && (
        <p
          className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300"
          aria-live="polite"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {warning}
        </p>
      )}
      {error && !adding && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}

      {/* ── Yaklaşan izinler ── */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
          <CalendarOff className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Yaklaşan izin yok.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                {t.barber_id ? <User className="size-3.5" /> : <Store className="size-3.5" />}
                {t.barber_name ?? "Tüm dükkan"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{rangeLabel(t)}</p>
                {t.reason && (
                  <p className="text-xs text-muted-foreground">{t.reason}</p>
                )}
              </div>
              <Button
                variant="destructive"
                size="icon-sm"
                aria-label="İzni sil"
                disabled={pending}
                onClick={() => handleDelete(t)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * İzin aralığını insan diliyle yazar. Dükkan yerelinde 00:00→00:00 ise
 * "tüm gün" biçimi kullanılır ("15–17 Temmuz" gibi, son gün dahil).
 */
function rangeLabel(t: AdminTimeOff): string {
  const start = shopDateTimeOf(t.starts_at);
  const end = shopDateTimeOf(t.ends_at);
  const isAllDay = start.minutes === 0 && end.minutes === 0;

  if (isAllDay) {
    const lastDay = addDaysISO(end.dateISO, -1);
    if (lastDay === start.dateISO) return `${formatDateLong(t.starts_at)} · Tüm gün`;
    // Bitişi "son gün dahil" göstermek için gün ortası bir an kullanırız.
    const lastNoonISO = shopLocalToUtc(lastDay, "12:00").toISOString();
    return `${formatDateLong(t.starts_at)} → ${formatDateLong(lastNoonISO)} · Tüm gün`;
  }
  return `${formatDateLong(t.starts_at)} ${formatClock(t.starts_at)} → ${formatDateLong(t.ends_at)} ${formatClock(t.ends_at)}`;
}
