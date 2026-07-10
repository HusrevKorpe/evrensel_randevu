import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Çerezsiz, oturumsuz Supabase istemcisi — HERKESE AÇIK veriler için.
 *
 * Neden var? `lib/supabase/server.ts` çerez okuduğu için onu kullanan her
 * sayfa "dinamik" olur (her istekte yeniden render). Vitrin verileri (hizmet,
 * berber, çalışma saati) herkese açık olduğundan çereze ihtiyaç yok —
 * bu istemciyle anasayfa STATİK üretilip önbellekten servis edilebilir
 * (çok daha hızlı ilk yükleme).
 *
 * RLS yine geçerli: anon anahtar sadece "public read" tablolarını okuyabilir.
 */
let client: ReturnType<typeof createSupabaseClient> | undefined;

export function createPublicClient() {
  client ??= createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Oturum yönetimi tamamen kapalı — bu istemci sadece veri okur.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return client;
}
