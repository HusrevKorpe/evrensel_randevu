"use client";

import { useState, useTransition } from "react";
import { CalendarCheck2, CalendarX2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  respondToAppointment,
  type RespondResult,
} from "@/app/randevu/onay/actions";

/**
 * Onay sayfasının işlem butonları. Maildeki hangi butona tıklandıysa
 * (`defaultAction`) o öne çıkar; ama iki seçenek de her zaman burada —
 * berber fikrini değiştirebilir. Sonuç aynı ekranda gösterilir.
 */
export function ApprovalActions({
  token,
  defaultAction,
}: {
  token: string;
  defaultAction: "onayla" | "reddet";
}) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"onayla" | "reddet" | null>(null);
  const [result, setResult] = useState<RespondResult | null>(null);

  function run(action: "onayla" | "reddet") {
    setBusy(action);
    startTransition(async () => {
      setResult(await respondToAppointment(token, action));
      setBusy(null);
    });
  }

  // İşlem bitti → butonların yerine sonuç kartı.
  if (result?.ok) {
    const confirmed = result.status === "confirmed";
    return (
      <div
        role="status"
        className={cn(
          "mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm",
          confirmed
            ? "border-brand/40 bg-brand/10"
            : "border-destructive/30 bg-destructive/10",
        )}
      >
        {confirmed ? (
          <CalendarCheck2 className="mt-0.5 size-5 shrink-0 text-brand" />
        ) : (
          <CalendarX2 className="mt-0.5 size-5 shrink-0 text-destructive" />
        )}
        <div>
          <p className="font-semibold">
            {confirmed ? "Randevu onaylandı ✓" : "Randevu reddedildi"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {confirmed
              ? "Müşteri takvimine işlendi. Bu sayfayı kapatabilirsin."
              : "Müşterinin e-postası varsa iptal bilgisi otomatik gönderildi."}
          </p>
        </div>
      </div>
    );
  }

  const buttons: {
    action: "onayla" | "reddet";
    label: string;
    icon: typeof CalendarCheck2;
    className: string;
  }[] = [
    {
      action: "onayla",
      label: "Randevuyu Onayla",
      icon: CalendarCheck2,
      className:
        "bg-brand text-brand-foreground hover:bg-brand/90 border-transparent",
    },
    {
      action: "reddet",
      label: "Reddet",
      icon: CalendarX2,
      className:
        "border-destructive/40 text-destructive hover:bg-destructive/10 bg-transparent",
    },
  ];
  // Maildeki seçim öne (üste) gelsin.
  if (defaultAction === "reddet") buttons.reverse();

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {buttons.map(({ action, label, icon: Icon, className }, i) => (
          <button
            key={action}
            type="button"
            disabled={pending}
            onClick={() => run(action)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60",
              i === 1 && "sm:flex-none",
              className,
            )}
          >
            {busy === action ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
            {label}
          </button>
        ))}
      </div>

      {result && !result.ok && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {result.message}
        </p>
      )}
    </div>
  );
}
