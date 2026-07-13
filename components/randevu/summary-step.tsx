"use client";

import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  Radar,
  Scissors,
  User,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatDuration, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";

type SummaryData = {
  service: Service;
  barberLabel: string;
  dayLong: string;
  time: string;
  name: string;
  phone: string;
};

// ── Adım 6: Özet + onay ─────────────────────────────────────────────────

export function SummaryStep({
  data,
  submitError,
}: {
  data: SummaryData;
  submitError: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Row icon={<Scissors className="size-4" />} label="Hizmet">
          <span className="font-medium">{data.service.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">
            {formatDuration(data.service.duration_min)}
          </span>
        </Row>
        <Row icon={<User className="size-4" />} label="Usta">
          <span className="font-medium">{data.barberLabel}</span>
        </Row>
        <Row icon={<CalendarClock className="size-4" />} label="Tarih">
          <span className="font-medium">{data.dayLong}</span>
        </Row>
        <Row icon={<Clock className="size-4" />} label="Saat">
          <span className="font-medium">{data.time}</span>
        </Row>
        <Row icon={<Phone className="size-4" />} label="İletişim" last>
          <span className="font-medium">{data.name}</span>
          <span className="ml-2 text-sm text-muted-foreground">{data.phone}</span>
        </Row>
      </div>

      {/* Toplam ücret */}
      <div className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">Toplam</span>
        <span className="font-heading text-2xl font-bold text-brand">
          {formatPrice(data.service.price)}
        </span>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Ödeme dükkânda yapılır. Gönderince bu saat senin için tutulur; ustan
        onaylayınca randevun kesinleşir.
      </p>

      {submitError && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5",
        !last && "border-b border-border/60",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex-1 text-right">{children}</span>
    </div>
  );
}

// ── Başarı ekranı ───────────────────────────────────────────────────────

export function SuccessView({
  reference,
  serviceName,
  barberName,
  dayLong,
  time,
  trackUrl,
  onReset,
}: {
  reference: string;
  serviceName: string;
  barberName: string;
  dayLong: string;
  time: string;
  trackUrl: string | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
        <CheckCircle2 className="size-9" />
      </span>
      <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        Randevu talebin alındı! 🎉
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground text-balance">
        {dayLong} · {time} · {barberName}. Talebini aldık ve bu saati senin için
        tuttuk. Ustan onayladıktan sonra randevun kesinleşir; sonucu aşağıdaki
        bağlantıdan canlı takip edebilirsin.
      </p>

      {/* Referans numarası */}
      <div className="mt-6 w-full max-w-xs rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Randevu referansın
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand">
          {reference}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{serviceName}</p>
      </div>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
        {trackUrl && (
          <Link
            href={trackUrl}
            className={cn(
              buttonVariants(),
              "h-11 bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            <Radar className="size-4" />
            Randevu durumunu takip et
          </Link>
        )}
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: trackUrl ? "outline" : "default" }),
            "h-11",
            !trackUrl && "bg-brand text-brand-foreground hover:bg-brand/90",
          )}
        >
          Anasayfaya dön
        </Link>
        <button
          type="button"
          onClick={onReset}
          className={cn(buttonVariants({ variant: "ghost" }), "h-11")}
        >
          Yeni randevu al
        </button>
      </div>

      {trackUrl && (
        <p className="mt-4 max-w-xs text-xs text-muted-foreground text-balance">
          💡 İpucu: Bu bağlantıyı kaydet (ekran görüntüsü al veya yer imine
          ekle) — onaylanınca oradan görebilirsin.
        </p>
      )}
    </div>
  );
}
