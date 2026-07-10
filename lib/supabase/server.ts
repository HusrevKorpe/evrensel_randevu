import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu (server component / server action / route handler) tarafında
 * kullanılan Supabase istemcisi. Çerezlerle oturumu taşır, RLS geçerlidir.
 *
 * Not: Next 16'da `cookies()` asenkrondur, bu yüzden `await` gerekir.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldıysa çerez yazılamaz;
            // oturum yenilemeyi middleware halleder (Faz 4).
          }
        },
      },
    },
  );
}
