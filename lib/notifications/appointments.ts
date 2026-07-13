import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email";
import { buildApprovalLinks, buildTrackingLink } from "@/lib/notifications/approval-token";
import {
  cancelledEmail,
  newBookingBarberEmail,
  pendingNagEmail,
  type AppointmentEmailData,
  type PendingNagItem,
} from "@/lib/notifications/templates";
import {
  getCustomerSubscriptions,
  getStaffSubscriptions,
  pushToSubscriptions,
} from "@/lib/notifications/push-subscriptions";
import {
  customerCancelledPush,
  customerConfirmedPush,
  staffNewBookingPush,
} from "@/lib/notifications/push-templates";
import { siteConfig } from "@/lib/site";
import type { AppointmentStatus } from "@/types";

/**
 * RANDEVU BİLDİRİM ORKESTRASYONU (Faz 7 düzeni).
 *
 * Akış: yeni randevu → SADECE atanan berbere onay/red maili;
 * iptal/red → müşteriye iptal maili (e-postası varsa). Başka mail yok.
 * Sahip tüm randevuları panelden izler (Randevular + Geçmiş sayfaları).
 *
 * Buradaki fonksiyonlar `after()` içinden (yanıtı bloklamadan) ve cron'dan
 * çağrılır — o bağlamlarda oturum çerezi olmadığı için ADMIN istemci kullanılır
 * (yalnızca sunucu; `server-only` kalkanı var). Bildirim hatası randevuyu
 * ASLA bozmaz: hepsi yakalanır ve log'lanır.
 */

/** Dükkan sahibinin adresi: ADMIN_EMAIL yoksa site iletişim adresi. */
function adminEmail(): string {
  return process.env.ADMIN_EMAIL || siteConfig.email;
}

/** Gömülü ilişki bazen dizi bazen nesne döner; ilk kaydı güvenle çıkarır. */
function relOf<T>(rel: T | T[] | null): T | null {
  return !rel ? null : Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export type FetchedAppointment = AppointmentEmailData & {
  id: string;
  status: AppointmentStatus;
  customerEmail: string | null;
  barberId: string | null;
  barberEmail: string | null;
  /** null=elle iptal/red, 'timeout'=usta süresinde yanıtlamadı. */
  cancelReason: string | null;
};

/** Randevuyu hizmet/berber ad + berber e-postasıyla çeker; bulunamazsa null. */
export async function fetchAppointment(
  id: string,
): Promise<FetchedAppointment | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, starts_at, status, cancel_reason, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(id, name, email)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchAppointment:", error.message);
    return null;
  }

  const service = relOf(data.service as { name: string } | { name: string }[] | null);
  const barber = relOf(
    data.barber as
      | { id: string; name: string; email: string | null }
      | { id: string; name: string; email: string | null }[]
      | null,
  );

  return {
    id: data.id as string,
    status: data.status as AppointmentStatus,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    serviceName: service?.name ?? "—",
    barberName: barber?.name ?? "—",
    barberId: barber?.id ?? null,
    barberEmail: barber?.email ?? null,
    startsAtISO: data.starts_at,
    reference: (data.id as string).slice(0, 8).toUpperCase(),
    notes: data.notes,
    cancelReason: (data.cancel_reason as string | null) ?? null,
  };
}

/** FetchedAppointment'tan push şablonları için ortak müşteri verisi. */
function customerData(appt: FetchedAppointment) {
  return {
    serviceName: appt.serviceName,
    barberName: appt.barberName,
    startsAtISO: appt.startsAtISO,
    reference: appt.reference,
  };
}

/**
 * Yeni randevu: SADECE atanan berbere onay/red maili — diğer ustalar ve
 * sahip mail almaz. Berberin e-postası tanımlı değilse mail kaybolmasın
 * diye sahibine (ADMIN_EMAIL) düşer.
 */
export async function notifyCreated(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;

    // 1) E-POSTA (mevcut davranış — DEĞİŞMEDİ): atanan berbere onay/red maili.
    const links = buildApprovalLinks(appointmentId, appt.startsAtISO);
    const content = newBookingBarberEmail(appt, links);
    await sendEmail({ to: appt.barberEmail || adminEmail(), ...content });

    // 2) PUSH (yeni, e-postanın yanına): izin vermiş berber/sahip cihazlarına.
    if (appt.barberId) {
      const subs = await getStaffSubscriptions(appt.barberId);
      if (subs.length) {
        await pushToSubscriptions(
          subs,
          staffNewBookingPush({ customerName: appt.customerName, ...customerData(appt) }),
        );
      }
    }
  } catch (err) {
    console.error("notifyCreated:", err);
  }
}

/**
 * ONAY: müşteriye SEVİNDİRİCİ push (e-posta bilinçli GÖNDERİLMEZ — Faz 7).
 * İzin vermiş müşteri cihazlarına "randevun onaylandı 🎉" düşer.
 */
export async function notifyConfirmed(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;
    const subs = await getCustomerSubscriptions(appointmentId);
    if (!subs.length) return;
    const trackUrl = buildTrackingLink(appt.id, appt.startsAtISO);
    await pushToSubscriptions(subs, customerConfirmedPush(customerData(appt), trackUrl));
  } catch (err) {
    console.error("notifyConfirmed:", err);
  }
}

/**
 * İPTAL/RED (elle): müşteriye e-posta (adresi varsa — mevcut davranış) VE
 * izin vermiş cihazlarına push. Zaman aşımı buraya GİRMEZ (o push-only,
 * aşağıdaki notifyTimedOut) — e-posta akışı aynen korunur.
 */
export async function notifyCancelled(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;

    // 1) E-POSTA (mevcut davranış — DEĞİŞMEDİ): adresi varsa iptal maili.
    if (appt.customerEmail) {
      await sendEmail({ to: appt.customerEmail, ...cancelledEmail(appt) });
    }

    // 2) PUSH (yeni): izin vermiş müşteri cihazlarına.
    const subs = await getCustomerSubscriptions(appointmentId);
    if (subs.length) {
      const trackUrl = buildTrackingLink(appt.id, appt.startsAtISO);
      const timedOut = appt.cancelReason === "timeout";
      await pushToSubscriptions(
        subs,
        customerCancelledPush(customerData(appt), trackUrl, timedOut),
      );
    }
  } catch (err) {
    console.error("notifyCancelled:", err);
  }
}

/**
 * ZAMAN AŞIMI: yalnızca PUSH — usta süresinde dönemedi, talep otomatik kapandı.
 * E-postaya DOKUNMAZ (zaman aşımında hiç mail atılmıyordu, öyle kalıyor).
 * Sadece cron süpürmesinden çağrılır (müşteri sayfayı açıksa zaten görür).
 */
export async function notifyTimedOut(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;
    const subs = await getCustomerSubscriptions(appointmentId);
    if (!subs.length) return;
    const trackUrl = buildTrackingLink(appt.id, appt.startsAtISO);
    await pushToSubscriptions(subs, customerCancelledPush(customerData(appt), trackUrl, true));
  } catch (err) {
    console.error("notifyTimedOut:", err);
  }
}

// ── Bekleyen randevu dürtmesi (cron) ─────────────────────────────────────

export type NagRunResult = {
  ok: boolean;
  /** Kaç berbere dürtme maili gönderildi */
  sent: number;
  failed: number;
  /** Yanıt bekleyen toplam randevu sayısı */
  pending: number;
  error?: string;
};

/**
 * Hâlâ `pending` bekleyen GELECEK randevuları berber bazında gruplar ve her
 * berbere tek özet/dürtme maili atar (berberin e-postası yoksa sahibine).
 *
 * İşaretleme yok — cron günde bir çalışır (vercel.json) ve randevu
 * yanıtlanana kadar her sabah yeniden hatırlatmak zaten İSTENEN davranış.
 */
export async function sendPendingNags(): Promise<NagRunResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, starts_at, customer_name, customer_phone, notes, service:services(name), barber:barbers(id, name, email)",
    )
    .eq("status", "pending")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("sendPendingNags:", error.message);
    return { ok: false, sent: 0, failed: 0, pending: 0, error: error.message };
  }

  type BarberRel = { id: string; name: string; email: string | null };
  const rows = data ?? [];

  // Berber bazında grupla (e-postasız berberin talepleri sahibine gider).
  const groups = new Map<
    string,
    { to: string; barberName: string; items: PendingNagItem[] }
  >();

  for (const row of rows) {
    const service = relOf(row.service as { name: string } | { name: string }[] | null);
    const barber = relOf(row.barber as BarberRel | BarberRel[] | null);
    if (!barber) continue;

    const emailData: AppointmentEmailData = {
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      serviceName: service?.name ?? "—",
      barberName: barber.name,
      startsAtISO: row.starts_at,
      reference: (row.id as string).slice(0, 8).toUpperCase(),
      notes: row.notes,
    };

    const group = groups.get(barber.id) ?? {
      to: barber.email || adminEmail(),
      barberName: barber.name,
      items: [],
    };
    group.items.push({
      data: emailData,
      links: buildApprovalLinks(row.id as string, row.starts_at),
    });
    groups.set(barber.id, group);
  }

  let sent = 0;
  let failed = 0;

  for (const { to, barberName, items } of groups.values()) {
    const result = await sendEmail({ to, ...pendingNagEmail(barberName, items) });
    if (result.ok) sent++;
    else {
      failed++;
      if (result.skipped) {
        return {
          ok: false,
          sent,
          failed,
          pending: rows.length,
          error: "RESEND_API_KEY tanımlı değil — dürtmeler atlandı.",
        };
      }
    }
  }

  return { ok: true, sent, failed, pending: rows.length };
}
