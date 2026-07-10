import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Ayarlar" };

/** Geçici — Parça C'de hizmet / çalışma saati / izin yönetimi gelecek. */
export default async function SettingsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Ayarlar" description="Hizmetler, çalışma saatleri ve izinler." />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
        <Settings className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Hizmet, çalışma saati ve izin yönetimi yakında (Parça C).
        </p>
      </div>
    </div>
  );
}
