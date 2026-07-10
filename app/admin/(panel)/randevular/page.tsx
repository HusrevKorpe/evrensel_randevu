import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Randevular" };

/** Geçici — Parça B'de randevu listesi + filtre + işlemler gelecek. */
export default async function AppointmentsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Randevular" description="Tüm randevuları yönet." />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
        <CalendarDays className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Randevu listesi, filtreler ve işlemler yakında (Parça B).
        </p>
      </div>
    </div>
  );
}
