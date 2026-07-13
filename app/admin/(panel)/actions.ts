"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteSubscriptionByEndpoint,
  saveStaffSubscription,
} from "@/lib/notifications/push-subscriptions";

/**
 * PERSONEL (berber/sahip) WEB PUSH ABONELİĞİ.
 *
 * Yetki: `requireAdmin()` — yalnızca giriş yapmış panel kullanıcısı. Giriş
 * e-postasını `barbers.email` ile eşleyip aboneliği o berbere bağlarız; eşleşme
 * yoksa barber_id NULL kalır = "sahip cihazı" → TÜM yeni randevuları alır
 * (e-posta yönlendirmesindeki ADMIN_EMAIL fallback ile aynı mantık).
 */

/** Giriş e-postasından berber id'sini çözer; eşleşme yoksa null (sahip). */
async function resolveBarberId(): Promise<string | null> {
  const user = await requireAdmin();
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("barbers")
    .select("id")
    .eq("email", email)
    .limit(1);
  return data?.[0]?.id ?? null;
}

export async function saveStaffPushSubscription(
  sub: PushSubscriptionJSON,
): Promise<{ ok: boolean; error?: string }> {
  const barberId = await resolveBarberId();
  return saveStaffSubscription(barberId, sub);
}

export async function removeStaffPushSubscription(endpoint: string): Promise<void> {
  // Sadece girişliyse işlem yap (yabancı endpoint silinmesin).
  await requireAdmin();
  if (typeof endpoint === "string" && endpoint) {
    await deleteSubscriptionByEndpoint(endpoint);
  }
}
