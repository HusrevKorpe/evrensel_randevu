import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE ROLE istemcisi — tüm RLS güvenlik kurallarını BYPASS eder.
 * ⚠️ SADECE sunucu tarafında, güvenilir işlemler için kullan
 * (randevu oluşturma, admin işlemleri). Asla client'a sızdırma.
 *
 * `import "server-only"` sayesinde bu dosya yanlışlıkla bir client
 * component'e import edilirse build HATA verir — güvenlik kalkanı.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
