import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush, type PushPayload, type StoredSubscription } from "@/lib/notifications/push";

/**
 * PUSH ABONELİKLERİ — kaydetme / getirme / silme (DB katmanı).
 *
 * Yazma/okuma yalnızca SUNUCU tarafında, service-role istemciyle yapılır;
 * push_subscriptions tablosu RLS ile anon'a tamamen kapalı (0005 migration).
 * Kapıyı çağıran taraftaki imzalı token (müşteri) ya da admin oturumu (berber)
 * açar — tıpkı randevu onay akışı gibi.
 */

/** Tarayıcının PushSubscription.toJSON() çıktısıyla uyumlu asgari şekil. */
export type BrowserSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SaveResult = { ok: boolean; error?: string };

/** Ham (istemciden gelen) aboneliği doğrular + kolonlara ayırır. Geçersizse null. */
function normalize(raw: unknown): StoredSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<BrowserSubscription>;
  const endpoint = typeof s.endpoint === "string" ? s.endpoint : "";
  const p256dh = s.keys?.p256dh;
  const auth = s.keys?.auth;
  if (!endpoint || typeof p256dh !== "string" || typeof auth !== "string") {
    return null;
  }
  return { endpoint, p256dh, auth };
}

/** Ortak upsert — endpoint benzersiz, aynı tarayıcı tekrar abone olursa günceller. */
async function upsert(row: {
  audience: "customer" | "staff";
  appointment_id: string | null;
  barber_id: string | null;
  sub: StoredSubscription;
}): Promise<SaveResult> {
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      audience: row.audience,
      appointment_id: row.appointment_id,
      barber_id: row.barber_id,
      endpoint: row.sub.endpoint,
      p256dh: row.sub.p256dh,
      auth: row.sub.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push upsert:", error.message);
    return { ok: false, error: "Abonelik kaydedilemedi." };
  }
  return { ok: true };
}

/** Müşteri: bir randevuyu takip için abone olur. */
export async function saveCustomerSubscription(
  appointmentId: string,
  raw: unknown,
): Promise<SaveResult> {
  const sub = normalize(raw);
  if (!sub) return { ok: false, error: "Geçersiz abonelik." };
  return upsert({
    audience: "customer",
    appointment_id: appointmentId,
    barber_id: null,
    sub,
  });
}

/** Berber/sahip: bir cihazı yeni-randevu bildirimleri için kaydeder (barberId
 *  null = sahip cihazı → tüm yeni randevuları alır). */
export async function saveStaffSubscription(
  barberId: string | null,
  raw: unknown,
): Promise<SaveResult> {
  const sub = normalize(raw);
  if (!sub) return { ok: false, error: "Geçersiz abonelik." };
  return upsert({
    audience: "staff",
    appointment_id: null,
    barber_id: barberId,
    sub,
  });
}

/** Aboneliği endpoint'iyle siler (kullanıcı "bildirimi kapat" derse ya da ölü abonelik). */
export async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  if (!endpoint) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) console.error("deleteSubscriptionByEndpoint:", error.message);
}

/** Bir randevunun MÜŞTERİ abonelikleri (durum değişince bildirmek için). */
export async function getCustomerSubscriptions(
  appointmentId: string,
): Promise<StoredSubscription[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("audience", "customer")
    .eq("appointment_id", appointmentId);
  if (error) {
    console.error("getCustomerSubscriptions:", error.message);
    return [];
  }
  return (data ?? []) as StoredSubscription[];
}

/**
 * Bir berbere gidecek PERSONEL abonelikleri: o berbere ait olanlar + sahip
 * cihazları (barber_id null). Böylece yeni randevu hem ilgili ustaya hem de
 * paneli açan sahibe düşer — e-posta yönlendirmesiyle aynı mantık.
 */
export async function getStaffSubscriptions(
  barberId: string,
): Promise<StoredSubscription[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("audience", "staff")
    .or(`barber_id.eq.${barberId},barber_id.is.null`);
  if (error) {
    console.error("getStaffSubscriptions:", error.message);
    return [];
  }
  return (data ?? []) as StoredSubscription[];
}

/**
 * Bir listeye toplu bildirim gönderir; ölü abonelikleri (410/404) otomatik
 * temizler. Bildirim hatası çağıranı ASLA bozmaz.
 */
export async function pushToSubscriptions(
  subs: StoredSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      const res = await sendPush(s, payload);
      if (res.ok) {
        sent++;
      } else {
        failed++;
        if (res.gone) await deleteSubscriptionByEndpoint(s.endpoint);
      }
    }),
  );
  return { sent, failed };
}
