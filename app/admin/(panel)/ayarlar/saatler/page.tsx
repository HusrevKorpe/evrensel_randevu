import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getAllWorkingHours } from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";

export const metadata: Metadata = { title: "Çalışma Saatleri" };

export default async function WorkingHoursSettingsPage() {
  // Auth kontrolü + saatler paralel.
  const [, hours] = await Promise.all([requireAdmin(), getAllWorkingHours()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Çalışma Saatleri"
        description="Dükkanın haftalık açılış, kapanış ve mola saatleri. Buradaki program hem sitede görünen çalışma saatlerini hem de alınabilecek randevu saatlerini belirler. Kapalı gün = randevu alınamaz."
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

      <WorkingHoursEditor initialHours={hours} />
    </div>
  );
}
