import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, ChevronRight, Clock, Scissors } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  getAllServices,
  getAllWorkingHours,
  getUpcomingTimeOff,
} from "@/lib/admin/data";
import { getBarbers } from "@/lib/data";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Ayarlar" };

/** Ayarlar ana sayfası: üç yönetim alanına açılan kapı + küçük özetler. */
export default async function SettingsPage() {
  await requireAdmin();

  const [services, hours, timeOff, barbers] = await Promise.all([
    getAllServices(),
    getAllWorkingHours(),
    getUpcomingTimeOff(),
    getBarbers(),
  ]);

  const activeServices = services.filter((s) => s.is_active).length;
  const openDays = new Set(hours.map((h) => h.weekday)).size;

  const cards = [
    {
      href: "/admin/ayarlar/hizmetler",
      icon: Scissors,
      title: "Hizmetler",
      description: "Hizmet ekle, düzenle, sırala; fiyat ve süre yönet.",
      summary: `${services.length} hizmet · ${activeServices} aktif`,
    },
    {
      href: "/admin/ayarlar/saatler",
      icon: Clock,
      title: "Çalışma Saatleri",
      description: "Berber bazında haftalık açılış, kapanış ve mola saatleri.",
      summary: `${barbers.length} berber · haftada ${openDays} gün açık`,
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
