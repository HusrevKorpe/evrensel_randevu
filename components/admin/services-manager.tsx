"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createService,
  deleteService,
  moveService,
  toggleServiceActive,
  updateService,
} from "@/app/admin/(panel)/ayarlar/hizmetler/actions";
import { ServiceForm } from "@/components/admin/service-form";
import { Button } from "@/components/ui/button";
import { formatDuration, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";

/**
 * Hizmet listesi + tüm işlemler (ekle / düzenle / sil / aktif-pasif / sırala).
 * Server action'lar revalidatePath yaptığı için başarıdan sonra liste kendini
 * tazeler; burada sadece hangi formun açık olduğunu ve hataları tutarız.
 */
export function ServicesManager({ services }: { services: Service[] }) {
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
      {/* ── Yeni hizmet ── */}
      {adding ? (
        <div className="rounded-2xl border border-brand/40 bg-card p-4 sm:p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold">Yeni Hizmet</h2>
          <ServiceForm
            onSubmit={async (input) => {
              const res = await createService(input);
              if (res.ok) setAdding(false);
              return res;
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <Button size="sm" onClick={() => { setAdding(true); setEditingId(null); }}>
          <Plus />
          Yeni Hizmet
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}

      {/* ── Liste ── */}
      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center text-sm text-muted-foreground">
          Henüz hizmet yok. &quot;Yeni Hizmet&quot; ile ilkini ekle.
        </div>
      ) : (
        <ul className="space-y-2">
          {services.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "rounded-2xl border border-border bg-card p-4",
                !s.is_active && "opacity-60",
              )}
            >
              {editingId === s.id ? (
                <>
                  <h2 className="mb-3 font-heading text-sm font-semibold">
                    Hizmeti Düzenle
                  </h2>
                  <ServiceForm
                    initial={s}
                    onSubmit={async (input) => {
                      const res = await updateService(s.id, input);
                      if (res.ok) setEditingId(null);
                      return res;
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Sıralama okları */}
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Yukarı taşı"
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveService(s.id, "up"))}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Aşağı taşı"
                      disabled={pending || i === services.length - 1}
                      onClick={() => run(() => moveService(s.id, "down"))}
                    >
                      <ArrowDown />
                    </Button>
                  </div>

                  {/* Bilgi */}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {s.name}
                      {!s.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Pasif
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(s.price)} · {formatDuration(s.duration_min)}
                      {s.description && (
                        <span className="hidden sm:inline"> — {s.description}</span>
                      )}
                    </p>
                  </div>

                  {/* İşlemler */}
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label={s.is_active ? "Pasife al" : "Aktife al"}
                      title={s.is_active ? "Pasife al (vitrinden gizle)" : "Aktife al"}
                      disabled={pending}
                      onClick={() => run(() => toggleServiceActive(s.id, !s.is_active))}
                    >
                      {s.is_active ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Düzenle"
                      disabled={pending}
                      onClick={() => { setEditingId(s.id); setAdding(false); }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Sil"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`"${s.name}" silinsin mi?`))
                          run(() => deleteService(s.id));
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
