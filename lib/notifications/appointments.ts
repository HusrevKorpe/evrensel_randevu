import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email";
import {
  cancelledEmail,
  confirmedEmail,
  createdEmail,
  newBookingAdminEmail,
  reminderEmail,
  type AppointmentEmailData,
} from "@/lib/notifications/templates";
import { siteConfig } from "@/lib/site";

/**
 * RANDEVU BİLDİRİM ORKESTRASYONU.
 *
 * Buradaki fonksiyonlar `after()` içinden (yanıtı bloklamadan) ve cron'dan
 * çağrılır — o bağlamlarda oturum çerezi olmadığı için ADMIN istemci kullanılır
 * (yalnızca sunucu; `server-only` kalkanı var). Bildirim hatası randevuyu
 * ASLA bozmaz: hepsi yakalanır ve log'lanır.
 */

/** Berberin bildirim adresi: ADMIN_EMAIL yoksa site iletişim adresi. */
function adminEmail(): string {
  return process.env.ADMIN_EMAIL || siteConfig.email;
}

type FetchedAppointment = AppointmentEmailData & {
  customerEmail: string | null;
};

/** Randevuyu hizmet/berber adlarıyla çeker; bulunamazsa null. */
async function fetchAppointment(id: string): Promise<FetchedAppointment | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, starts_at, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("fetchAppointment:", error.message);
    return null;
  }

  const nameOf = (rel: { name: string } | { name: string }[] | null): string =>
    !rel ? "—" : Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;

  return {
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    serviceName: nameOf(data.service),
    barberName: nameOf(data.barber),
    startsAtISO: data.starts_at,
    reference: (data.id as string).slice(0, 8).toUpperCase(),
    notes: data.notes,
  };
}

/** Yeni randevu: müşteriye "talep alındı", berbere "yeni talep" e-postası. */
export async function notifyCreated(appointmentId: string): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt) return;

    const jobs: Promise<unknown>[] = [
      sendEmail({ to: adminEmail(), ...newBookingAdminEmail(appt) }),
    ];
    if (appt.customerEmail) {
      jobs.push(sendEmail({ to: appt.customerEmail, ...createdEmail(appt) }));
    }
    await Promise.all(jobs);
  } catch (err) {
    console.error("notifyCreated:", err);
  }
}

/** Durum değişikliği: onay/iptalde müşteriye bilgi (e-postası varsa). */
export async function notifyStatusChange(
  appointmentId: string,
  status: "confirmed" | "cancelled",
): Promise<void> {
  try {
    const appt = await fetchAppointment(appointmentId);
    if (!appt?.customerEmail) return;

    const content =
      status === "confirmed" ? confirmedEmail(appt) : cancelledEmail(appt);
    await sendEmail({ to: appt.customerEmail, ...content });
  } catch (err) {
    console.error("notifyStatusChange:", err);
  }
}

// ── Hatırlatma (cron) ────────────────────────────────────────────────────

export type ReminderRunResult = {
  ok: boolean;
  sent: number;
  failed: number;
  noEmail: number;
  error?: string;
};

/**
 * Önümüzdeki REMINDER_HOURS_BEFORE (vars. 24) saat içinde başlayan,
 * henüz hatırlatılmamış aktif randevulara hatırlatma gönderir.
 *
 * Tekrar koruması: gönderim başarılı olunca `reminder_sent_at` işaretlenir
 * (migration 0002) → cron üst üste çalışsa da ikinci e-posta gitmez.
 */
export async function sendDueReminders(): Promise<ReminderRunResult> {
  const hoursBefore = Number(process.env.REMINDER_HOURS_BEFORE ?? 24) || 24;
  const now = new Date();
  const horizon = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, starts_at, customer_name, customer_phone, customer_email, notes, service:services(name), barber:barbers(name)",
    )
    .is("reminder_sent_at", null)
    .in("status", ["pending", "confirmed"])
    .gt("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    // 42703 = kolon yok → migration 0002 henüz çalıştırılmamış.
    const hint =
      error.code === "42703"
        ? "reminder_sent_at kolonu yok — supabase/migrations/0002_reminders.sql dosyasını Supabase SQL Editor'da çalıştır."
        : error.message;
    console.error("sendDueReminders:", hint);
    return { ok: false, sent: 0, failed: 0, noEmail: 0, error: hint };
  }

  const nameOf = (rel: { name: string } | { name: string }[] | null): string =>
    !rel ? "—" : Array.isArray(rel) ? (rel[0]?.name ?? "—") : rel.name;

  let sent = 0;
  let failed = 0;
  let noEmail = 0;

  for (const row of data ?? []) {
    // E-postasız randevuyu da işaretleriz — yoksa her cron turunda yeniden taranır.
    if (!row.customer_email) {
      noEmail++;
    } else {
      const result = await sendEmail({
        to: row.customer_email,
        ...reminderEmail({
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          serviceName: nameOf(row.service),
          barberName: nameOf(row.barber),
          startsAtISO: row.starts_at,
          reference: (row.id as string).slice(0, 8).toUpperCase(),
          notes: row.notes,
        }),
      });
      if (result.ok) sent++;
      else {
        failed++;
        if (result.skipped) {
          // Anahtar yokken hiçbirini işaretleme — anahtar gelince gönderilebilsin.
          return {
            ok: false,
            sent,
            failed,
            noEmail,
            error: "RESEND_API_KEY tanımlı değil — hatırlatmalar atlandı.",
          };
        }
        continue; // gönderilemedi → işaretleme, sonraki turda yeniden dene
      }
    }

    const { error: markError } = await admin
      .from("appointments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", row.id);
    if (markError) console.error("sendDueReminders mark:", markError.message);
  }

  return { ok: true, sent, failed, noEmail };
}
