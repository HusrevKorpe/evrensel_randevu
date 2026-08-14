"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type {
  BarberActionResult,
  BarberInput,
} from "@/app/admin/(panel)/ayarlar/berberler/actions";
import type { Barber } from "@/types";

/**
 * Berber ekleme/düzenleme formu. Hem "yeni" hem "düzenle" için kullanılır:
 * `initial` verilirse alanlar dolu gelir. Kaydetme işini `onSubmit` prop'u
 * (üstteki manager'ın server action çağrısı) yapar.
 *
 * Bildirim e-postası bilerek BURADA DEĞİL: o alan listede her satırın altında,
 * kendi başına kaydedilen bir kutu (sık değişen ayar, forma girmesin).
 */
export function BarberForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Barber;
  onSubmit: (input: BarberInput) => Promise<BarberActionResult>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSubmit({ name, title, bio });
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
    });
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Ad *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Örn. Emre Usta"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Ünvan
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Örn. Berber"
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Açıklama
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Vitrindeki ekip kartında adın altında görünür (opsiyonel)."
            className={inputCls}
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
          {pending ? "Kaydediliyor…" : initial ? "Kaydet" : "Ekle"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
