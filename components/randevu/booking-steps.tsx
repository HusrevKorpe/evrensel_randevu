"use client";

import {
  AlertCircle,
  Clock,
  Loader2,
  Scissors,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { SelectCard } from "@/components/randevu/select-card";
import { formatDuration, formatPrice } from "@/lib/format";
import { hhmmToMinutes, type DayOption } from "@/lib/booking/time";
import type { BarberChoice } from "@/lib/booking/availability";
import { cn } from "@/lib/utils";
import type { Barber, Service } from "@/types";

// ── Adım 1: Hizmet ──────────────────────────────────────────────────────

export function ServiceStep({
  services,
  selected,
  onSelect,
}: {
  services: Service[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  if (services.length === 0) {
    return <EmptyNote text="Hizmetler şu an yüklenemedi. Lütfen daha sonra tekrar dene." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => (
        <SelectCard
          key={service.id}
          selected={selected === service.id}
          onSelect={() => onSelect(service.id)}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <Scissors className="size-5" />
          </span>
          <span className="ml-3 flex-1 pr-6">
            <span className="block font-heading font-semibold">{service.name}</span>
            <span className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              {formatDuration(service.duration_min)}
            </span>
          </span>
          <span className="font-heading text-lg font-bold text-brand">
            {formatPrice(service.price)}
          </span>
        </SelectCard>
      ))}
    </div>
  );
}

// ── Adım 2: Usta ────────────────────────────────────────────────────────

export function BarberStep({
  barbers,
  selected,
  onSelect,
}: {
  barbers: Barber[];
  selected: BarberChoice | null;
  onSelect: (id: BarberChoice) => void;
}) {
  return (
    <div className="grid gap-3">
      {/* "Farketmez" — sunucu en uygun ustayı otomatik atar */}
      <SelectCard selected={selected === "any"} onSelect={() => onSelect("any")}>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <Users className="size-5" />
        </span>
        <span className="ml-3 flex-1 pr-6">
          <span className="flex items-center gap-1.5 font-heading font-semibold">
            Farketmez
            <Sparkles className="size-3.5 text-brand" />
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            En uygun ustayı biz seçelim — daha çok saat açılır.
          </span>
        </span>
      </SelectCard>

      {barbers.map((barber) => (
        <SelectCard
          key={barber.id}
          selected={selected === barber.id}
          onSelect={() => onSelect(barber.id)}
        >
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
            {barber.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={barber.avatar_url}
                alt={barber.name}
                className="size-full object-cover"
              />
            ) : (
              <User className="size-5" />
            )}
          </span>
          <span className="ml-3 flex-1 pr-6">
            <span className="block font-heading font-semibold">{barber.name}</span>
            {barber.title && (
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {barber.title}
              </span>
            )}
          </span>
        </SelectCard>
      ))}
    </div>
  );
}

// ── Adım 3: Tarih ───────────────────────────────────────────────────────

export function DateStep({
  days,
  openWeekdays,
  selected,
  onSelect,
}: {
  days: DayOption[];
  openWeekdays: Set<number>;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {days.map((day) => {
        const closed = !openWeekdays.has(day.weekday);
        const isSelected = selected === day.iso;
        return (
          <button
            key={day.iso}
            type="button"
            disabled={closed}
            onClick={() => onSelect(day.iso)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center rounded-xl border py-3 transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-brand/30",
              closed
                ? "cursor-not-allowed border-dashed border-border/60 text-muted-foreground/40"
                : isSelected
                  ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                  : "border-border bg-card hover:border-brand/40",
            )}
          >
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {day.isToday ? "Bugün" : day.weekdayShort}
            </span>
            <span className="mt-0.5 font-heading text-lg font-bold">{day.dayNum}</span>
            <span className="text-xs text-muted-foreground">
              {closed ? "Kapalı" : day.monthShort}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Adım 4: Saat ────────────────────────────────────────────────────────

export function TimeStep({
  loading,
  error,
  times,
  selected,
  onSelect,
  onBackToDate,
}: {
  loading: boolean;
  error: string | null;
  times: string[] | null;
  selected: string | null;
  onSelect: (time: string) => void;
  onBackToDate: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-brand" />
        <p className="text-sm">Uygun saatler hesaplanıyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!times || times.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Clock className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Bu gün için uygun saat kalmadı.
        </p>
        <button
          type="button"
          onClick={onBackToDate}
          className="text-sm font-medium text-brand hover:underline"
        >
          Başka bir gün seç
        </button>
      </div>
    );
  }

  // Görsel olarak sabah / öğleden sonra diye ikiye ayır (13:00 sınırı).
  const morning = times.filter((t) => hhmmToMinutes(t) < 12 * 60);
  const afternoon = times.filter((t) => hhmmToMinutes(t) >= 12 * 60);

  return (
    <div className="space-y-5">
      <TimeGroup label="Öğleden önce" times={morning} selected={selected} onSelect={onSelect} />
      <TimeGroup label="Öğleden sonra" times={afternoon} selected={selected} onSelect={onSelect} />
    </div>
  );
}

function TimeGroup({
  label,
  times,
  selected,
  onSelect,
}: {
  label: string;
  times: string[];
  selected: string | null;
  onSelect: (time: string) => void;
}) {
  if (times.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {times.map((time) => {
          const isSelected = selected === time;
          return (
            <button
              key={time}
              type="button"
              onClick={() => onSelect(time)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-xl border py-2.5 text-center text-sm font-medium transition-colors outline-none",
                "focus-visible:ring-3 focus-visible:ring-brand/30",
                isSelected
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-card hover:border-brand/40",
              )}
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Ortak ───────────────────────────────────────────────────────────────

function EmptyNote({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}
