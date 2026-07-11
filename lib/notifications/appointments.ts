import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email";
import { buildApprovalLinks } from "@/lib/notifications/approval-token";
import {
  cancelledEmail,
  newBookingBarberEmail,
  pendingNagEmail,
  type AppointmentEmailData,
  type PendingNagItem,
} from "@/lib/notifications/templates";
import { siteConfig } from "@/lib/site";
import type { AppointmentStatus } from "@/types";

/**
 * RANDEVU BİLDİRİM ORKESTRASYONU (Faz 7 düzeni).
 *
 * Akış: yeni randevu → ATANAN BERBERE onay/red maili (+ sahibine kopya);
 * iptal/red → müşteriye iptal maili (e-postası varsa). Başka mail yok.
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
  status: AppointmentStatus;
  customerEmail: string | null;
  barberEmail: string | null;
};

/** Randevuyu hizmet/berber ad + berber e-postasıyla çeker; bulunamazsa null. */
export async function fetchAppointment(
  id: string,
): Promise<FetchedAppointment | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, starts_at, status, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(name, email)",
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
      | { name: string; email: string | null }
      | { name: string; email: string | null }[]
      | null,
  );

  return {
    status: data.status as AppointmentStatus,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    serviceName: service?.name ?? "—",
    barberName: barber?.name ?? "—",
    barberEmail: barber?.email ?? null,
    startsAtISO: data.starts_at,
    reference: (data.id as string).slice(0, 8).toUpperCase(),
    notes: data.notes,
  };
}

/**
 * Yeni randevu: ATANAN BERBERE onay/red maili. Berberin e-postası yoksa
 * mail sahibine (ADMIN_EMAIL) düşer; varsa sahibine ayrıca kopya gider —
 * böylece dükkan sahibi her talepten haberdar olur.
 */
export async function notifyCreated(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;

    const links = buildApprovalLinks(appointmentId, appt.startsAtISO);
    const content = newBookingBarberEmail(appt, links);

    const to = appt.barberEmail || adminEmail();
    const jobs: Promise<unknown>[] = [sendEmail({ to, ...content })];
    if (to !== adminEmail()) {
      jobs.push(sendEmail({ to: adminEmail(), ...content }));
    }
    await Promise.all(jobs);
  } catch (err) {
    console.error("notifyCreated:", err);
  }
}

/** İptal/red: müşteriye bilgi (e-postası varsa). Onayda mail atılmaz. */
export async function notifyCancelled(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt?.customerEmail) return;
    await sendEmail({ to: appt.customerEmail, ...cancelledEmail(appt) });
  } catch (err) {
    console.error("notifyCancelled:", err);
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
