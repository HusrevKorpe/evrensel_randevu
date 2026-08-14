"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  createBarber,
  deleteBarber,
  moveBarber,
  saveBarberEmail,
  toggleBarberActive,
  updateBarber,
} from "@/app/admin/(panel)/ayarlar/berberler/actions";
import { BarberForm } from "@/components/admin/barber-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BarberWithEmail } from "@/types";

/**
 * Berber listesi + tüm işlemler (ekle / düzenle / sil / aktif-pasif / sırala)
 * ve her satırda bildirim e-postası.
 *
 * Server action'lar revalidatePath yaptığı için başarıdan sonra liste kendini
 * tazeler; burada sadece hangi formun açık olduğunu ve hataları tutarız.
 * E-posta satırı kendi state'ini ayrı tutar (satır bazında kaydedilir).
 */
export function BarbersManager({ barbers }: { barbers: BarberWithEmail[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Yeni berber ── */}
      {adding ? (
        <div className="rounded-2xl border border-brand/40 bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold">Yeni Berber</h2>
          <BarberForm
            onSubmit={async (input) => {
              const res = await createBarber(input);
              if (res.ok) setAdding(false);
              return res;
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" onClick={() => { setAdding(true); setEditingId(null); }}>
          <Plus />
          Yeni Berber
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}

      {/* ── Liste ── */}
      {barbers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center text-sm text-muted-foreground">
          Henüz berber yok. &quot;Yeni Berber&quot; ile ilkini ekle.
        </div>
      ) : (
        <ul className="space-y-2">
          {barbers.map((b, i) => (
            <li
              key={b.id}
              className={cn(
                "rounded-2xl border border-border bg-card p-4",
                !b.is_active && "opacity-60",
              )}
            >
              {editingId === b.id ? (
                <>
                  <h2 className="mb-3 font-heading text-sm font-semibold">
                    Berberi Düzenle
                  </h2>
                  <BarberForm
                    initial={b}
                    onSubmit={async (input) => {
                      const res = await updateBarber(b.id, input);
                      if (res.ok) setEditingId(null);
                      return res;
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sıralama okları */}
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Yukarı taşı"
                        disabled={pending || i === 0}
                        onClick={() => run(() => moveBarber(b.id, "up"))}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Aşağı taşı"
                        disabled={pending || i === barbers.length - 1}
                        onClick={() => run(() => moveBarber(b.id, "down"))}
                      >
                        <ArrowDown />
                      </Button>
                    </div>

                    {/* Bilgi */}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {b.name}
                        {!b.is_active && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Pasif
                          </span>
                        )}
                      </p>
                      {(b.title || b.bio) && (
                        <p className="text-sm text-muted-foreground">
                          {b.title}
                          {b.title && b.bio && " — "}
                          {b.bio && (
                            <span className="hidden sm:inline">{b.bio}</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* İşlemler */}
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={b.is_active ? "Pasife al" : "Aktife al"}
                        title={
                          b.is_active ? "Pasife al (vitrinden gizle)" : "Aktife al"
                        }
                        disabled={pending}
                        onClick={() => run(() => toggleBarberActive(b.id, !b.is_active))}
                      >
                        {b.is_active ? <EyeOff /> : <Eye />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Düzenle"
                        disabled={pending}
                        onClick={() => { setEditingId(b.id); setAdding(false); }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Sil"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`"${b.name}" silinsin mi?`))
                            run(() => deleteBarber(b.id));
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <BarberEmailRow barber={b} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Tek berberin bildirim e-postası — kendi başına kaydedilir.
 * Boş bırakılırsa o berberin bildirimleri ADMIN_EMAIL'e düşer.
 */
function BarberEmailRow({ barber }: { barber: BarberWithEmail }) {
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
    <>
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
    </>
  );
}
