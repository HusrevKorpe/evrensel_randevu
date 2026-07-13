import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/claims";

/**
 * DATA ACCESS LAYER (DAL) — auth kontrolünü TEK yerde toplar.
 *
 * Proxy ilk savunmadır (isteği hızlıca yönlendirir) ama TEK BAŞINA yeterli
 * DEĞİL: server action'lar UI dışından da çağrılabilir. Bu yüzden asıl kontrolü
 * veriye en yakın yerde — bu fonksiyonlarla — yaparız.
 *
 * `cache` React'in aynı render turunda fonksiyonu tek sefer çalıştırmasını
 * sağlar → aynı istekte 5 yerde çağırsak da Supabase'e 1 kez gidilir.
 */

/**
 * Girişli kullanıcıyı döner; giriş yoksa null. Yönlendirme YAPMAZ.
 *
 * `getUser()` yerine YEREL doğrulama (getClaims): asimetrik JWT anahtarıyla
 * imza yerelde doğrulanır → her sayfa render'ında Supabase Auth'a ağ gidiş-
 * dönüşü olmaz. Asimetrik anahtar kapalıysa güvenle getUser'a düşer.
 */
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  return getVerifiedUser(supabase);
});

/** Korumalı sayfa/eylemlerde kullan: giriş yoksa login'e atar, varsa user döner. */
export const requireAdmin = cache(async () => {
  const user = await getAdminUser();
  if (!user) redirect("/admin/giris");
  return user;
});
