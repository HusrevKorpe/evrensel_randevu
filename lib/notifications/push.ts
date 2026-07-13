import "server-only";
import webpush from "web-push";
import { siteConfig } from "@/lib/site";

/**
 * WEB PUSH GÖNDERİM KATMANI (kanal soyutlaması).
 *
 * E-postanın (email.ts) İKİZİ — aynı desen, ikinci kanal. E-postaya HİÇ
 * dokunmaz; onun YANINA gelir. Çağıran kod (appointments.ts) her iki kanalı
 * da yan yana kullanır.
 *
 * VAPID anahtarları (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY) tanımlı
 * değilse gönderim SESSİZCE ATLANIR — tıpkı RESEND_API_KEY'siz e-posta gibi.
 * Böylece anahtarlar gelmeden de site sorunsuz çalışır.
 */

/** Bildirim yükü — service worker (public/sw.js) bunu JSON olarak okur. */
export type PushPayload = {
  title: string;
  body: string;
  /** Tıklanınca açılacak adres. */
  url?: string;
  /** Aynı randevunun bildirimleri üst üste yığılmasın diye grup etiketi. */
  tag?: string;
  icon?: string;
};

/** Veritabanında sakladığımız haliyle bir push aboneliği. */
export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushResult = {
  ok: boolean;
  /** VAPID tanımsız → gönderim atlandı. */
  skipped?: boolean;
  /** 404/410 → abonelik artık ölü, çağıran DB'den silmeli. */
  gone?: boolean;
  error?: string;
};

// VAPID'i bir kez ayarlarız. null = henüz denenmedi, true/false = sonuç.
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  // Push servisleri kendini tanıtan bir iletişim ister (mailto:/https:).
  const subject = process.env.VAPID_SUBJECT || `mailto:${siteConfig.email}`;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    // Anahtar formatı bozuksa çök­meyelim, sadece push'u kapatalım.
    console.error("push setVapidDetails:", err);
    configured = false;
  }
  return configured;
}

/**
 * Tek bir aboneye bildirim gönderir. Abonelik ölmüşse (404/410) `gone:true`
 * döner ki çağıran onu DB'den temizlesin. Hata ASLA fırlatmaz.
 */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureConfigured()) {
    console.log(
      `[push atlandı: VAPID yok] endpoint=${sub.endpoint.slice(0, 40)}…`,
    );
    return { ok: false, skipped: true };
  }

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404 (yok) / 410 (gitti) = abonelik iptal edilmiş → temizlensin.
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, gone: true };
    }
    console.error("sendPush:", statusCode ?? err);
    return { ok: false, error: `push ${statusCode ?? "hata"}` };
  }
}
