import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

/** Girişli kullanıcıyı döner; giriş yoksa null. Yönlendirme YAPMAZ. */
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Korumalı sayfa/eylemlerde kullan: giriş yoksa login'e atar, varsa user döner. */
export const requireAdmin = cache(async () => {
  const user = await getAdminUser();
  if (!user) redirect("/admin/giris");
  return user;
});
