import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getUpcomingTimeOff } from "@/lib/admin/data";
import { getBarbers } from "@/lib/data";
import { PageHeader } from "@/components/admin/page-header";
import { TimeOffManager } from "@/components/admin/time-off-manager";

export const metadata: Metadata = { title: "İzinler" };

export default async function TimeOffSettingsPage() {
  // Auth kontrolü + iki sorgu hepsi paralel.
  const [, barbers, entries] = await Promise.all([
    requireAdmin(),
    getBarbers(),
    getUpcomingTimeOff(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="İzinler / Kapalı Günler"
        description="Bu aralıklarda randevu alınamaz. İzin, mevcut randevuları otomatik iptal etmez."
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
      <TimeOffManager
        barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
        entries={entries}
      />
    </div>
  );
}
