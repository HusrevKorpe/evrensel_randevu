/**
 * Bir randevunun hizmet adlarını TEK bir okunur string'e çevirir.
 *
 * Neden burada? Çoklu hizmetten sonra (0006 migration) tüm görüntüleme
 * yerleri (admin kartı, takvim, e-posta, push, onay sayfası, canlı takip)
 * hâlâ TEK bir `serviceName` string'i tüketiyor. Birleştirmeyi burada tek
 * yerde yapınca o dosyaların hiçbirine dokunmamıza gerek kalmıyor.
 *
 * Örn. ["Saç + Sakal", "Yüz Bakımı / Ağda"] → "Saç + Sakal, Yüz Bakımı / Ağda"
 * (hizmet adının içinde zaten "+" olabildiği için ayraç olarak "," kullanılır.)
 */

type ServiceEmbed = { name: string; sort_order: number };
/** Supabase gömülü satırı: `appointment_services(services(name, sort_order))`. */
export type ServiceJoinRow = { services: ServiceEmbed | ServiceEmbed[] | null };

/** Gömülü ilişki bazen dizi bazen nesne döner; güvenle çıkarır. */
function embedOf(rel: ServiceEmbed | ServiceEmbed[] | null): ServiceEmbed | null {
  return !rel ? null : Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/**
 * Ara tablodan gelen hizmetleri sıra numarasına göre dizip adlarını birleştirir.
 * Liste boşsa `fallback` (randevunun birincil hizmet adı) döner.
 */
export function combineServiceNames(
  items: ServiceJoinRow[] | null | undefined,
  fallback: string,
): string {
  if (!items || items.length === 0) return fallback;
  const names = items
    .map((r) => embedOf(r.services))
    .filter((s): s is ServiceEmbed => Boolean(s))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.name);
  return names.length > 0 ? names.join(", ") : fallback;
}
