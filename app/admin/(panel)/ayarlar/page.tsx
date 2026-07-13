import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, ChevronRight, Clock, Scissors, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  getAllBarbersWithEmail,
  getAllServices,
  getAllWorkingHours,
  getUpcomingTimeOff,
} from "@/lib/admin/data";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Ayarlar" };

/** Ayarlar ana sayfası: yönetim alanlarına açılan kapı + küçük özetler. */
export default async function SettingsPage() {
  // Auth kontrolü + 4 özet sorgusu hepsi tek seferde PARALEL.
  const [, services, hours, timeOff, barbers] = await Promise.all([
    requireAdmin(),
    getAllServices(),
    getAllWorkingHours(),
    getUpcomingTimeOff(),
    getAllBarbersWithEmail(),
  ]);

  const activeServices = services.filter((s) => s.is_active).length;
  const openDays = new Set(hours.map((h) => h.weekday)).size;
  const activeBarbers = barbers.filter((b) => b.is_active);
  const withEmail = activeBarbers.filter((b) => b.email).length;

  const cards = [
    {
      href: "/admin/ayarlar/hizmetler",
      icon: Scissors,
      title: "Hizmetler",
      description: "Hizmet ekle, düzenle, sırala; fiyat ve süre yönet.",
      summary: `${services.length} hizmet · ${activeServices} aktif`,
    },
    {
      href: "/admin/ayarlar/berberler",
      icon: Users,
      title: "Berberler",
      description:
        "Bildirim e-postaları: yeni randevu talebi hangi adrese gitsin.",
      summary: `${activeBarbers.length} berber · ${withEmail} e-posta tanımlı`,
    },
    {
      href: "/admin/ayarlar/saatler",
      icon: Clock,
      title: "Çalışma Saatleri",
      description:
        "Dükkan geneli haftalık açılış, kapanış ve mola saatleri (sitede de görünür).",
      summary: `Haftada ${openDays} gün açık`,
    },
    {
      href: "/admin/ayarlar/izinler",
      icon: CalendarOff,
      title: "İzinler / Kapalı Günler",
      description: "Tatil, izin ve dükkanın kapalı olduğu özel aralıklar.",
      summary:
        timeOff.length === 0
          ? "Yaklaşan izin yok"
          : `${timeOff.length} yaklaşan izin`,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Hizmetler, çalışma saatleri ve izinler."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, description, summary }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand/50"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
                <Icon className="size-5 text-brand" />
              </span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <h2 className="font-heading font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <p className="mt-auto text-xs font-medium text-brand">{summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
