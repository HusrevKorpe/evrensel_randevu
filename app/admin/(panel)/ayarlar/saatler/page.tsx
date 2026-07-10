import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getAllWorkingHours } from "@/lib/admin/data";
import { getBarbers } from "@/lib/data";
import { PageHeader } from "@/components/admin/page-header";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";

export const metadata: Metadata = { title: "Çalışma Saatleri" };

export default async function WorkingHoursSettingsPage() {
  await requireAdmin();
  const [barbers, hours] = await Promise.all([getBarbers(), getAllWorkingHours()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Çalışma Saatleri"
        description="Berber bazında haftalık çalışma penceresi ve mola. Kapalı gün = randevu alınamaz."
        action={
          <Link
            href="/admin/ayarlar"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
          >
            <ChevronLeft className="size-4" />
            Ayarlar
          </Link>
        }
      />

      {barbers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aktif berber bulunamadı.</p>
        </div>
      ) : (
        barbers.map((b) => (
          <WorkingHoursEditor
            key={b.id}
            barberId={b.id}
            barberName={b.name}
            initialHours={hours.filter((h) => h.barber_id === b.id)}
          />
        ))
      )}
    </div>
  );
}
