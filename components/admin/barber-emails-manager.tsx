"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveBarberEmail } from "@/app/admin/(panel)/ayarlar/berberler/actions";
import type { BarberWithEmail } from "@/types";

/**
 * Berber bildirim e-postalarını düzenleme listesi.
 * Her satır kendi başına kaydedilir; boş bırakılırsa o berberin bildirimleri
 * dükkan sahibinin adresine (ADMIN_EMAIL) düşer.
 */
export function BarberEmailsManager({ barbers }: { barbers: BarberWithEmail[] }) {
  return (
    <div className="space-y-3">
      {barbers.map((b) => (
        <BarberRow key={b.id} barber={b} />
      ))}
    </div>
  );
}

function BarberRow({ barber }: { barber: BarberWithEmail }) {
  const [email, setEmail] = useState(barber.email ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Kaydedilmiş değerden sapınca "Kaydet" aktifleşir.
  const dirty = email.trim().toLowerCase() !== (barber.email ?? "");

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveBarberEmail(barber.id, email);
      if (result.ok) setSaved(true);
      else setError(result.error ?? "Kaydedilemedi.");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {barber.name}
            {!barber.is_active && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                pasif
              </span>
            )}
          </p>
          {barber.title && (
            <p className="text-xs text-muted-foreground">{barber.title}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          placeholder="ornek@eposta.com (boş = sahibine gider)"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
          aria-label={`${barber.name} bildirim e-postası`}
          aria-invalid={!!error}
          className={cn(
            "w-full flex-1 rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground/60",
            "focus:border-brand focus:ring-3 focus:ring-brand/20",
            error ? "border-destructive" : "border-input",
          )}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
            "bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50",
          )}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved && !dirty ? "Kaydedildi" : "Kaydet"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
