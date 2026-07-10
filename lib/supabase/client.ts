import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı (client component) tarafında kullanılan Supabase istemcisi.
 * Sadece anon key kullanır — RLS güvenlik kuralları geçerlidir.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
