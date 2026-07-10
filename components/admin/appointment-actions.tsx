"use client";

import { useState, useTransition } from "react";
import { Check, CheckCheck, RotateCcw, UserX, X } from "lucide-react";
import { updateAppointmentStatus } from "@/app/admin/(panel)/randevular/actions";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/types";

/**
 * Randevu durumuna göre uygun işlem butonlarını gösterir.
 * Akış: bekliyor → onaylı → tamamlandı. "Gelmedi"/"İptal" yan yollar;
 * bitmiş durumlar "Geri al" ile geri çevrilebilir.
 *
 * Server action `useTransition` ile çağrılır → tıklayınca butonlar kilitlenir,
 * bittiğinde revalidatePath sayfayı tazeler (ekstra refresh gerekmez).
 */

type Transition = {
  to: AppointmentStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "outline" | "destructive" | "ghost";
  confirm?: string; // doluysa önce window.confirm ile sorar
};

const TRANSITIONS: Record<AppointmentStatus, Transition[]> = {
  pending: [
    { to: "confirmed", label: "Onayla", icon: Check, variant: "default" },
    {
      to: "cancelled",
      label: "İptal",
      icon: X,
      variant: "destructive",
      confirm: "Bu randevu iptal edilsin mi?",
    },
  ],
  confirmed: [
    { to: "completed", label: "Tamamlandı", icon: CheckCheck, variant: "default" },
    { to: "no_show", label: "Gelmedi", icon: UserX, variant: "outline" },
    {
      to: "cancelled",
      label: "İptal",
      icon: X,
      variant: "destructive",
      confirm: "Bu randevu iptal edilsin mi?",
    },
  ],
  completed: [
    { to: "confirmed", label: "Geri al", icon: RotateCcw, variant: "ghost" },
  ],
  no_show: [
    { to: "confirmed", label: "Geri al", icon: RotateCcw, variant: "ghost" },
  ],
  cancelled: [
    {
      to: "confirmed",
      label: "Geri al",
      icon: RotateCcw,
      variant: "ghost",
      confirm: "Randevu yeniden aktifleştirilsin mi?",
    },
  ],
};

export function AppointmentActions({
  id,
  status,
}: {
  id: string;
  status: AppointmentStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actions = TRANSITIONS[status];

  if (actions.length === 0) return null;

  function run(to: AppointmentStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, to);
      if (!res.ok) setError(res.error ?? "Bir hata oluştu.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.to}
            type="button"
            size="sm"
            variant={a.variant}
            disabled={pending}
            onClick={() => run(a.to, a.confirm)}
          >
            <a.icon />
            {a.label}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
