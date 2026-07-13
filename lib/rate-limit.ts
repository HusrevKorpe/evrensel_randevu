import "server-only";
import { headers } from "next/headers";

/**
 * BASİT HIZ SINIRLAYICI (in-memory, sabit pencere).
 *
 * Amaç: Server Action'lar UI dışından da (doğrudan POST) çağrılabildiği için
 * biri booking uçlarını döngüde tetikleyip çöp randevu / bildirim spam'i
 * yapmasın. Anon insert politikası kaldırıldıktan sonra (0007) kalan tek
 * kötüye-kullanım yüzeyi bu action'lardır; burada frenliyoruz.
 *
 * ⚠️ SINIRI: Sayaç süreç belleğinde tutulur. Vercel Fluid Compute sıcak
 * instance'ı tekrar kullandığından tek dükkanlık düşük trafikte bu pratikte
 * yeterli; ama instance'lar arasında PAYLAŞILMAZ ve soğuk başlangıçta sıfırlanır.
 * Ciddi trafik/saldırı gelirse burayı Upstash Redis (`@upstash/ratelimit`) gibi
 * kalıcı bir store ile değiştir — imza (`rateLimit(key, limit, windowMs)`) aynı
 * kalır, sadece içi değişir.
 */

type Bucket = { count: number; resetAt: number };

// Anahtar → o pencere içindeki sayaç. Modül düzeyinde = instance ömrü boyunca yaşar.
const buckets = new Map<string, Bucket>();

// Map'in sınırsız büyümesini engelle: ara sıra süresi dolmuş kayıtları sil.
function prune(now: number) {
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/**
 * `key` için `windowMs` içinde en fazla `limit` isteğe izin ver.
 * İzin varsa { ok:true }, aşıldıysa { ok:false, retryAfterSec } döner.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  // Pencere yok ya da dolmuş → yeni pencere başlat.
  if (!b || now >= b.resetAt) {
    if (buckets.size > 1000) prune(now); // ucuz bakım, nadiren
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  // Pencere içinde ve limit aşıldı → reddet.
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }

  // Pencere içinde, yer var → say ve geç.
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/**
 * İsteği yapan istemcinin IP'sini header'lardan çöz. Vercel arkasında
 * `x-forwarded-for` gelir (ilk değer gerçek istemci). Bulunamazsa "unknown"
 * → o durumda tüm bilinmeyenler aynı kovaya düşer (yine de fren görür).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
