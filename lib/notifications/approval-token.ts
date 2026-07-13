import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteConfig } from "@/lib/site";

/**
 * ONAY LİNKİ TOKEN'I — berber, e-postadaki linkle GİRİŞ YAPMADAN
 * randevuyu onaylayıp reddedebilsin diye.
 *
 * Nasıl çalışır? Token = "randevuId.sonKullanma.imza". İmza, gizli anahtarla
 * atılmış HMAC-SHA256'dır: içeriği değiştiren imzayı tutturamaz, anahtarı
 * bilmeyen imza üretemez. Yani link, o TEK randevu için süreli bir yetkidir.
 *
 * Anahtar: APPROVAL_LINK_SECRET; tanımlı değilse SUPABASE_SERVICE_ROLE_KEY'den
 * türetilir (yüksek entropili, zaten sunucu sırrı) — ekstra kurulum gerektirmez.
 *
 * ⚠️ Token yetki taşır ama işlem YAPMAZ: linkin açıldığı sayfa önce özet
 * gösterir, işlem butonla (POST) yapılır. Mail sunucuları linkleri güvenlik
 * taraması için otomatik açar; GET'te işlem yapsaydık randevular kendi
 * kendine onaylanırdı.
 */

/**
 * Amaca göre HMAC anahtarı. Etiket ("approval" / "status") sabit önek olur ki
 * bir amaç için üretilen imza başka amaçta GEÇMESİN (onay token'ı ile durum
 * token'ı birbirinin yerine kullanılamaz). "approval-link:" öneki geriye
 * uyumluluk için AYNEN korunur — dolaşımdaki onay linkleri bozulmasın.
 */
function hmacKey(purpose: "approval" | "status"): string | null {
  const secret =
    process.env.APPROVAL_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return `${purpose}-link:${secret}`;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/**
 * Randevu için imzalı token üretir; anahtar yoksa null (link e-postaya konmaz).
 * @param expUnix son kullanma (unix saniye) — randevu başlangıcını veriyoruz:
 *                randevu başladıktan sonra mailden onay/red anlamsız.
 */
export function createApprovalToken(
  appointmentId: string,
  expUnix: number,
): string | null {
  const key = hmacKey("approval");
  if (!key) return null;
  const payload = `${appointmentId}.${expUnix}`;
  return `${payload}.${sign(payload, key)}`;
}

export type TokenCheck =
  | { ok: true; appointmentId: string }
  | { ok: false; reason: "invalid" | "expired" };

/** Token'ı doğrular: imza sağlam mı + süresi geçmiş mi. */
export function verifyApprovalToken(token: string): TokenCheck {
  return verifyToken(token, "approval");
}

/** Ortak doğrulayıcı — amaç etiketine göre imzayı ve süreyi kontrol eder. */
function verifyToken(token: string, purpose: "approval" | "status"): TokenCheck {
  const key = hmacKey(purpose);
  if (!key) return { ok: false, reason: "invalid" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  const [appointmentId, expRaw, sig] = parts;

  const expected = sign(`${appointmentId}.${expRaw}`, key);
  // timingSafeEqual: karşılaştırma süresi içeriğe göre değişmesin
  // (zamanlama ölçerek imza tahmin etme saldırılarına karşı standart önlem).
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { ok: false, reason: "invalid" };

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now())
    return { ok: false, reason: "expired" };

  return { ok: true, appointmentId };
}

export type ApprovalLinks = { approveUrl: string; rejectUrl: string };

/**
 * E-postaya konacak mutlak onay/red linkleri; anahtar yoksa null.
 * İki link de AYNI sayfaya gider, `islem` yalnızca hangi butonun öne
 * çıkacağını söyler — işlem her durumda sayfadaki butonla yapılır.
 */
export function buildApprovalLinks(
  appointmentId: string,
  startsAtISO: string,
): ApprovalLinks | null {
  const exp = Math.floor(new Date(startsAtISO).getTime() / 1000);
  const token = createApprovalToken(appointmentId, exp);
  if (!token) return null;
  const base = `${siteConfig.url}/randevu/onay?token=${encodeURIComponent(token)}`;
  return { approveUrl: `${base}&islem=onayla`, rejectUrl: `${base}&islem=reddet` };
}

// ── MÜŞTERİ DURUM TAKİBİ ─────────────────────────────────────────────────
//
// Müşteri, randevu sonrası verilen imzalı linkle randevusunun durumunu (yalnız
// OKUMA) canlı takip eder. Onay token'ından AYRI amaç ("status") ile imzalanır:
// durum linki asla onay/red yapamaz. Süresi randevudan 2 gün sonrasına kadar —
// müşteri sonucu bir süre daha görebilsin.

/** Müşteri durum-takip token'ı; anahtar yoksa null. */
export function createStatusToken(
  appointmentId: string,
  expUnix: number,
): string | null {
  const key = hmacKey("status");
  if (!key) return null;
  const payload = `${appointmentId}.${expUnix}`;
  return `${payload}.${sign(payload, key)}`;
}

/** Durum token'ını doğrular (imza + süre). */
export function verifyStatusToken(token: string): TokenCheck {
  return verifyToken(token, "status");
}

/** Müşteriye verilecek mutlak takip linki (`/randevu/durum?token=...`); anahtar yoksa null. */
export function buildTrackingLink(
  appointmentId: string,
  startsAtISO: string,
): string | null {
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const exp = Math.floor((new Date(startsAtISO).getTime() + twoDaysMs) / 1000);
  const token = createStatusToken(appointmentId, exp);
  if (!token) return null;
  return `${siteConfig.url}/randevu/durum?token=${encodeURIComponent(token)}`;
}
