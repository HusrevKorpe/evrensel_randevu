import { siteConfig } from "@/lib/site";
import { formatClock, formatDateLong } from "@/lib/format";
import type { PushPayload } from "@/lib/notifications/push";

/**
 * PUSH BİLDİRİM ŞABLONLARI.
 *
 * E-posta şablonlarının (templates.ts) push karşılığı — ama çok daha kısa:
 * bildirim tek satır başlık + tek satır gövdedir. E-postaya dokunmaz.
 *
 * Müşteriye: randevusu ONAYLANINCA (e-postanın bilinçli atmadığı sevindirici
 * bildirim) ve İPTAL/zaman aşımına düşünce. Berbere: YENİ randevu gelince.
 */

export type CustomerPushData = {
  serviceName: string;
  barberName: string;
  startsAtISO: string;
  reference: string;
};

export type StaffPushData = CustomerPushData & {
  customerName: string;
};

function when(iso: string): string {
  return `${formatDateLong(iso)} · ${formatClock(iso)}`;
}

/** ✅ Müşteriye: randevun onaylandı. */
export function customerConfirmedPush(
  d: CustomerPushData,
  trackUrl: string | null,
): PushPayload {
  return {
    title: "Randevun onaylandı! 🎉",
    body: `${when(d.startsAtISO)} — ${d.barberName} seni bekliyor.`,
    url: trackUrl ?? `${siteConfig.url}/randevu`,
    tag: `appt-${d.reference}`,
  };
}

/** ❌ Müşteriye: randevun iptal/zaman aşımı. `timedOut` mesajı yumuşatır. */
export function customerCancelledPush(
  d: CustomerPushData,
  trackUrl: string | null,
  timedOut: boolean,
): PushPayload {
  return {
    title: timedOut ? "Randevun kesinleşemedi" : "Randevun iptal edildi",
    body: timedOut
      ? "Ustamız zamanında dönemedi, talebin kapandı. Yeni bir saat için bize ulaşabilirsin."
      : `${when(d.startsAtISO)} randevun iptal edildi. Dilersen bizi arayabilirsin.`,
    url: trackUrl ?? `${siteConfig.url}/randevu`,
    tag: `appt-${d.reference}`,
  };
}

/** 💈 Berbere: yeni randevu talebi geldi (panele götürür). */
export function staffNewBookingPush(d: StaffPushData): PushPayload {
  return {
    title: "Yeni randevu talebi 💈",
    body: `${d.customerName} — ${when(d.startsAtISO)} · ${d.serviceName}`,
    url: `${siteConfig.url}/admin/randevular`,
    tag: `new-${d.reference}`,
  };
}
