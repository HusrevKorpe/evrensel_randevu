"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ServiceActionResult, ServiceInput } from "@/app/admin/(panel)/ayarlar/hizmetler/actions";
import type { Service } from "@/types";

/**
 * Hizmet ekleme/düzenleme formu. Hem "yeni" hem "düzenle" için kullanılır:
 * `initial` verilirse alanlar dolu gelir. Kaydetme işini `onSubmit` prop'u
 * (üstteki manager'ın server action çağrısı) yapar.
 */
export function ServiceForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Service;
  onSubmit: (input: ServiceInput) => Promise<ServiceActionResult>;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(String(initial?.duration_min ?? 30));
  const [price, setPrice] = useState(String(initial?.price ?? ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await onSubmit({
        name,
        description,
        duration_min: Number(duration),
        price: Number(price),
      });
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
    });
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Hizmet adı *
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Örn. Saç Kesimi"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Süre (dakika) *
          </span>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
            min={5}
            max={600}
            step={5}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Fiyat (₺) *
          </span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min={0}
            step={1}
            placeholder="250"
            className={inputCls}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Açıklama
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Vitrinde hizmetin altında görünür (opsiyonel)."
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
