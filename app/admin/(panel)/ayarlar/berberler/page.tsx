import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getAllBarbersWithEmail } from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";
import { BarbersManager } from "@/components/admin/barbers-manager";

export const metadata: Metadata = { title: "Berberler" };

/**
 * Berber yönetimi: ekle / düzenle / sırala / pasife al + bildirim e-postası.
 * Yeni randevu talebi ve bekleyen randevu dürtmesi buradaki adrese gider (Faz 7).
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
        description="Vitrindeki ve randevu akışındaki ustaları yönet. Her berberin altındaki e-posta, yeni randevu taleplerinin tek tıkla onay linkiyle gideceği adrestir; boş bırakılırsa bildirimler dükkan sahibine düşer."
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

      {/* Boş durum manager'ın içinde — liste boşken de "Yeni Berber" görünmeli. */}
      <BarbersManager barbers={barbers} />
    </div>
  );
}
