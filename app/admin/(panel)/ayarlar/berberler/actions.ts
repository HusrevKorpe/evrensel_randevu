"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Berber bildirim e-postası kaydetme (server action).
 *
 * Güvenlik: server action'lar UI dışından da çağrılabilir → `requireAdmin()`
 * ile burada TEKRAR doğrularız. Yazma, girişli oturumun RLS'li istemcisiyle
 * yapılır ("admin write barbers" politikası) — service-role gerekmez.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SaveBarberEmailResult = { ok: boolean; error?: string };

export async function saveBarberEmail(
  barberId: string,
  emailRaw: string,
): Promise<SaveBarberEmailResult> {
  await requireAdmin();

  if (typeof barberId !== "string" || barberId.length === 0) {
    return { ok: false, error: "Berber bulunamadı." };
  }

  // Boş bırakmak serbest: o berberin bildirimleri ADMIN_EMAIL'e düşer.
  const trimmed = (emailRaw ?? "").trim().toLowerCase();
  if (trimmed && (trimmed.length > 120 || !EMAIL_RE.test(trimmed))) {
    return { ok: false, error: "Geçerli bir e-posta gir." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbers")
    .update({ email: trimmed || null })
    .eq("id", barberId);

  if (error) {
    // 42703 = kolon yok → migration 0003 henüz çalıştırılmamış.
    const msg =
      error.code === "42703"
        ? "email kolonu yok — 0003_barber_email.sql migration'ını Supabase SQL Editor'da çalıştır."
        : "Kaydedilemedi, tekrar deneyin.";
    console.error("saveBarberEmail:", error.message);
    return { ok: false, error: msg };
  }

  revalidatePath("/admin/ayarlar/berberler");
  revalidatePath("/admin/ayarlar");
  return { ok: true };
}
