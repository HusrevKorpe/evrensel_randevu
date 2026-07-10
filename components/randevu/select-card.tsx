"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sihirbazda tekrar eden "seçilebilir kart" — hizmet, usta, tarih hepsi bunu kullanır.
 * Seçiliyken altın kenarlık + sağ üstte onay işareti gösterir.
 */
export function SelectCard({
  selected,
  onSelect,
  disabled,
  className,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-center rounded-2xl border p-4 text-left transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-brand/30",
        "disabled:pointer-events-none disabled:opacity-40",
        selected
          ? "border-brand bg-brand/5 ring-1 ring-brand/30"
          : "border-border bg-card hover:border-brand/40",
        className,
      )}
    >
      {children}
      {selected && (
        <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
