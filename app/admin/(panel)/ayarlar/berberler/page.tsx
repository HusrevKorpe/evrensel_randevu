import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getAllBarbersWithEmail } from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";
import { BarberEmailsManager } from "@/components/admin/barber-emails-manager";

export const metadata: Metadata = { title: "Berberler" };

/**
 * Berber bildirim e-postaları — yeni randevu talebi ve bekleyen randevu
 * dürtmesi buradaki adrese gider (Faz 7).
 */
export default async function BarbersSettingsPage() {
  // Auth kontrolü ile berber sorgusu paralel.
  const [, barbers] = await Promise.all([
    requireAdmin(),
    getAllBarbersWithEmail(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Berberler"
        description="Her berberin bildirim e-postası: yeni randevu talepleri tek tıkla onay linkiyle bu adrese gider. Boş bırakılan berberin bildirimleri dükkan sahibine düşer."
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
          <p className="text-sm text-muted-foreground">Berber bulunamadı.</p>
        </div>
      ) : (
        <BarberEmailsManager barbers={barbers} />
      )}
    </div>
  );
}
