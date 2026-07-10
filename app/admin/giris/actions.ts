"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Giriş (server action). Form gönderilince sunucuda çalışır; Supabase
 * oturum çerezini burada kurar. Hata olursa mesajı state olarak geri döner,
 * başarılıysa panele yönlendirir.
 */

export type LoginState = { error?: string } | undefined;

export async function signInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "E-posta ve şifre gerekli." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Güvenlik: "e-posta yok" vs "şifre yanlış" ayrımı yapmayız (kullanıcı sızmasın).
    return { error: "E-posta veya şifre hatalı." };
  }

  // Açık yönlendirme (open-redirect) koruması: yalnızca kendi /admin yolumuza git.
  const next = nextRaw.startsWith("/admin") ? nextRaw : "/admin";
  redirect(next);
}
