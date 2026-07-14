"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, DoorClosed, Loader2 } from "lucide-react";
import { closeShopForToday } from "@/app/admin/(panel)/actions";
import { Button } from "@/components/ui/button";

/**
 * "BUGÜNÜ KAPAT" hızlı tuşu (dashboard).
 *
 * Berber doldu ya da erken kapatacaksa tek tuşla online randevuları bugünün
 * kalanına kapatır (tüm-dükkan izni açar). Mevcut randevular iptal OLMAZ.
 * Yanlışlıkla basmayı önlemek için iki adımlı onay. Geri açmak: Ayarlar > İzinler.
 */
export function CloseTodayButton({ initialClosed }: { initialClosed: boolean }) {
  const [closed, setClosed] = useState(initialClosed);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doClose() {
    setError(null);
    startTransition(async () => {
      const res = await closeShopForToday();
      if (res.ok) {
        setClosed(true);
        setConfirming(false);
      } else {
        setError(res.error);
      }
    });
  }

  if (closed) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium">Bugün online randevuya kapalı.</span>
        <span className="text-muted-foreground">
          Geri açmak için Ayarlar → İzinler’den kaldırabilirsin.
        </span>
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Doldun mu ya da erken mi kapatıyorsun? Bugünün kalanını online
            randevuya kapatabilirsin.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            <DoorClosed />
            Bugünü kapat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] px-4 py-3">
      <p className="text-sm font-medium">Bugünün kalanı online randevuya kapatılsın mı?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Yeni online rezervasyon durur. Bugün için ALINMIŞ randevular iptal olmaz,
        aynen kalır. İstediğinde Ayarlar → İzinler’den geri açarsın.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={pending}
          onClick={doClose}
        >
          {pending ? <Loader2 className="animate-spin" /> : <DoorClosed />}
          Evet, bugünü kapat
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Vazgeç
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
