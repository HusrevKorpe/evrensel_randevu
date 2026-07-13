import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarX2, Clock3, LinkIcon } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { StatusTracker } from "@/components/randevu/status-tracker";
import { verifyStatusToken } from "@/lib/notifications/approval-token";
import { resolveCustomerStatus } from "@/lib/booking/customer-status";

/**
 * MÜŞTERİ CANLI TAKİP SAYFASI — randevu sonrası verilen imzalı linkle açılır.
 *
 * Yetki: URL'deki imzalı DURUM token'ı (giriş gerekmez, yalnız OKUMA yetkisi).
 * Token geçersiz/süresi geçmişse randevu bilgisi SIZMAZ. İlk durum sunucuda
 * render edilir (JS'siz de çalışır); StatusTracker sonra canlı günceller.
 */

export const metadata: Metadata = {
  title: "Randevu Durumu",
  robots: { index: false, follow: false },
};

// Token sorgu parametresinden okunur → her istekte taze render.
export const dynamic = "force-dynamic";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-lg px-6 py-10 sm:py-16">
          {await renderContent(token)}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function renderContent(token: string) {
  if (!token) {
    return (
      <ErrorCard
        icon={<LinkIcon className="size-7 text-muted-foreground" />}
        title="Eksik bağlantı"
        text="Bu sayfa yalnızca randevu sonrası verilen takip bağlantısıyla açılır."
      />
    );
  }

  const check = verifyStatusToken(token);
  if (!check.ok) {
    return check.reason === "expired" ? (
      <ErrorCard
        icon={<Clock3 className="size-7 text-muted-foreground" />}
        title="Bağlantının süresi dolmuş"
        text="Bu takip bağlantısı artık geçerli değil. Yeni bir randevu için sitemizi kullanabilirsin."
      />
    ) : (
      <ErrorCard
        icon={<LinkIcon className="size-7 text-muted-foreground" />}
        title="Geçersiz bağlantı"
        text="Bu bağlantı tanınamadı. Lütfen sana verilen bağlantıyı değiştirmeden kullan."
      />
    );
  }

  const view = await resolveCustomerStatus(check.appointmentId);
  if (!view) {
    return (
      <ErrorCard
        icon={<CalendarX2 className="size-7 text-muted-foreground" />}
        title="Randevu bulunamadı"
        text="Bu randevuya ulaşılamadı. Dilersen sitemizden yeni bir randevu alabilirsin."
      />
    );
  }

  return <StatusTracker token={token} initial={view} />;
}

function ErrorCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
        {icon}
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
      <Link
        href="/randevu"
        className="mt-5 inline-block text-sm font-medium text-brand hover:underline"
      >
        Randevu al →
      </Link>
    </div>
  );
}
