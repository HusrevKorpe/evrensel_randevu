import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * YEREL JWT DOĞRULAMASI — Supabase imzalama anahtarları (JWKS) yardımcıları.
 *
 * `getClaims()` asimetrik anahtarla erişim token'ının imzasını Node'un
 * WebCrypto'suyla YERELDE doğrular → Supabase Auth sunucusuna ağ gidiş-dönüşü
 * YAPMAZ (eski `getUser()` her seferinde /auth/v1/user'a giderdi).
 *
 * Ama her istekte çerezler yüzünden YENİ bir Supabase istemcisi kurduğumuzdan,
 * istemcinin kendi JWKS önbelleği her seferinde boştur → getClaims public
 * anahtarı tekrar tekrar internetten çekmek zorunda kalır. Çözüm: public
 * doğrulama anahtarlarını BURADA modül düzeyinde bir kez çekip (warm sunucu
 * örneği boyunca kalıcı) önbelleğe al, getClaims'e elle geçir → sıcak yolda 0 ağ.
 *
 * Bunlar imza DOĞRULAMA anahtarıdır (imzalama değil) → herkese açıktır
 * (.well-known/jwks.json), sızıntı riski yoktur.
 */

// getClaims'in beklediği tam JWKS tipini imzasından türet (harici tip importu yok).
type Jwks = NonNullable<
  NonNullable<Parameters<SupabaseClient["auth"]["getClaims"]>[1]>["jwks"]
>;

const JWKS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const TTL_MS = 10 * 60 * 1000; // 10 dk — anahtar döndürülürse en geç bu kadar sonra tazelenir

let cache: Jwks | null = null;
let cachedAt = 0;

/**
 * Public JWKS'i döner (modül önbellekli). Çekilemezse elimizdeki eski değeri
 * ya da undefined döner — undefined olsa bile getClaims kendi içinden çeker
 * ya da getUser'a (ağ) düşer; yani hiçbir durumda auth bozulmaz.
 */
async function getSigningKeys(): Promise<Jwks | undefined> {
  const now = Date.now();
  if (cache && now - cachedAt < TTL_MS) return cache;
  try {
    const res = await fetch(JWKS_URL); // public, kimlik doğrulaması gerektirmez
    if (!res.ok) return cache ?? undefined;
    const data = (await res.json()) as Jwks;
    if (Array.isArray(data?.keys) && data.keys.length > 0) {
      cache = data;
      cachedAt = now;
    }
    return cache ?? undefined;
  } catch {
    return cache ?? undefined;
  }
}

/**
 * Girişli kullanıcıyı YEREL JWT doğrulamasıyla döner: `{ id, email }` veya `null`.
 *
 * Güvenlik/dayanıklılık:
 * - Asimetrik anahtar yoksa (ya da WebCrypto yoksa) getClaims otomatik olarak
 *   getUser()'a — yani sunucu tarafı doğrulamaya — düşer. Yani davranış her
 *   koşulda doğru; sadece asimetrik açıkken hızlı (yerel) çalışır.
 * - Token süresi dolduysa getClaims içindeki getSession onu YENİLER (çerezleri
 *   günceller), sonra doğrular → "1 saat sonra logout" riski yoktur.
 *
 * Not: JWKS çekimi (yukarıda) Supabase istemcisine/çerezlere DOKUNMAZ; sadece
 * harici public bir GET'tir. Bu yüzden istemci kurulumu ile getClaims arasında
 * çağrılması token tazeleme akışını bozmaz.
 */
export async function getVerifiedUser(
  supabase: SupabaseClient,
): Promise<{ id: string; email: string | null } | null> {
  const jwks = await getSigningKeys();
  const { data, error } = await supabase.auth.getClaims(
    undefined,
    jwks ? { jwks } : undefined,
  );
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
}
