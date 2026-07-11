import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarCheck2, CalendarX2, Clock3, LinkIcon } from "lucide-react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ApprovalActions } from "@/components/randevu/approval-actions";
import { verifyApprovalToken } from "@/lib/notifications/approval-token";
import { fetchAppointment } from "@/lib/notifications/appointments";
import { formatClock, formatDateLong } from "@/lib/format";

/**
 * BERBERİN ONAY SAYFASI — e-postadaki "Onayla / Reddet" linkleri buraya gelir.
 *
 * Neden link direkt işlem yapmıyor? Mail sunucuları linkleri güvenlik
 * taraması için OTOMATİK açar; GET'te işlem yapsaydık randevular kendi
 * kendine onaylanırdı. Bu sayfa önce özeti gösterir, işlem butonla yapılır.
 *
 * Yetki: URL'deki imzalı token (giriş gerekmez). Token geçersiz/süresi
 * geçmişse yalnızca hata görünür — randevu bilgisi SIZMAZ.
 */

export const metadata: Metadata = {
  title: "Randevu Onayı",
  robots: { index: false, follow: false },
};

// Token sorgu parametresinden okunur → her istekte taze render.
export const dynamic = "force-dynamic";

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const islem = sp.islem === "reddet" ? "reddet" : "onayla";

  const content = await renderContent(token, islem);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-lg px-6 py-10 sm:py-16">{content}</div>
      </main>
      <SiteFooter />
    </>
  );
}

async function renderContent(token: string, islem: "onayla" | "reddet") {
  if (!token) {
    return (
      <StatusCard
        icon={<LinkIcon className="size-7 text-muted-foreground" />}
        title="Eksik bağlantı"
        text="Bu sayfa yalnızca e-postadaki onay bağlantısıyla açılır. Lütfen maildeki butonu kullan."
      />
    );
  }

  const check = verifyApprovalToken(token);
  if (!check.ok) {
    return check.reason === "expired" ? (
      <StatusCard
        icon={<Clock3 className="size-7 text-muted-foreground" />}
        title="Bağlantının süresi dolmuş"
        text="Randevu saati geçtiği için bu bağlantı artık kullanılamaz. Randevuyu panelden yönetebilirsin."
        panelLink
      />
    ) : (
      <StatusCard
        icon={<LinkIcon className="size-7 text-muted-foreground" />}
        title="Geçersiz bağlantı"
        text="Bu bağlantı tanınamadı. Lütfen e-postadaki butonu değiştirmeden kullan."
      />
    );
  }

  const appt = await fetchAppointment(check.appointmentId);
  if (!appt) {
    return (
      <StatusCard
        icon={<CalendarX2 className="size-7 text-muted-foreground" />}
        title="Randevu bulunamadı"
        text="Bu randevu silinmiş olabilir. Panelden kontrol edebilirsin."
        panelLink
      />
    );
  }

  // Zaten yanıtlanmışsa butonları hiç gösterme — durumu söyle.
  if (appt.status !== "pending") {
    const done: Record<string, { title: string; text: string; ok?: boolean }> = {
      confirmed: {
        title: "Bu randevu zaten onaylanmış ✓",
        text: "Ekstra bir şey yapmana gerek yok.",
        ok: true,
      },
      cancelled: {
        title: "Bu randevu iptal edilmiş",
        text: "Talep daha önce reddedilmiş ya da panelden iptal edilmiş.",
      },
      completed: {
        title: "Bu randevu tamamlanmış",
        text: "Randevu geçmişte kalmış; yapılacak bir şey yok.",
      },
      no_show: {
        title: "Müşteri gelmedi olarak işaretlenmiş",
        text: "Randevu geçmişte kalmış; yapılacak bir şey yok.",
      },
    };
    const info = done[appt.status];
    return (
      <StatusCard
        icon={
          info.ok ? (
            <CalendarCheck2 className="size-7 text-brand" />
          ) : (
            <CalendarX2 className="size-7 text-muted-foreground" />
          )
        }
        title={info.title}
        text={info.text}
        panelLink
      >
        <AppointmentSummary appt={appt} />
      </StatusCard>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h1 className="font-heading text-xl font-semibold">
        Yeni randevu talebi 💈
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {islem === "reddet"
          ? "Bu talebi reddetmek üzeresin — aşağıdaki bilgileri kontrol et."
          : "Bu talebi onaylamak üzeresin — aşağıdaki bilgileri kontrol et."}
      </p>

      <AppointmentSummary appt={appt} />

      <ApprovalActions token={token} defaultAction={islem} />
    </div>
  );
}

function AppointmentSummary({
  appt,
}: {
  appt: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    barberName: string;
    startsAtISO: string;
    reference: string;
    notes?: string | null;
  };
}) {
  const rows: [string, ReactNode][] = [
    [
      "Müşteri",
      <>
        {appt.customerName}
        {" — "}
        <a href={`tel:${appt.customerPhone}`} className="text-brand hover:underline">
          {appt.customerPhone}
        </a>
      </>,
    ],
    ["Tarih", `${formatDateLong(appt.startsAtISO)} · ${formatClock(appt.startsAtISO)}`],
    ["Hizmet", appt.serviceName],
    ["Usta", appt.barberName],
    ["Referans", appt.reference],
  ];
  if (appt.notes) rows.push(["Not", appt.notes]);

  return (
    <dl className="mt-5 space-y-2.5 rounded-xl border border-border bg-background/50 p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-sm">
          <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusCard({
  icon,
  title,
  text,
  panelLink,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  panelLink?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
        {icon}
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
      {children && <div className="text-left">{children}</div>}
      {panelLink && (
        <Link
          href="/admin/randevular"
          className="mt-5 inline-block text-sm font-medium text-brand hover:underline"
        >
          Randevu paneline git →
        </Link>
      )}
    </div>
  );
}
