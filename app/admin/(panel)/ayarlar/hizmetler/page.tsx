import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getAllServices } from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";
import { ServicesManager } from "@/components/admin/services-manager";

export const metadata: Metadata = { title: "Hizmetler" };

export default async function ServicesSettingsPage() {
  // Auth kontrolü ile hizmet sorgusu paralel.
  const [, services] = await Promise.all([requireAdmin(), getAllServices()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Hizmetler"
        description="Vitrinde ve randevu akışında görünen hizmetleri yönet."
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
      <ServicesManager services={services} />
    </div>
  );
}
