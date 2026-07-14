"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
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

// ── "Bugünü kapat" — hızlı, tüm dükkan, günün kalanı ─────────────────────
//
// Berber doldu/erken kapatacaksa tek tuşla ONLINE randevuları BUGÜNÜN KALANINA
// kapatır: [şu an → yarın 00:00) aralığında tüm-dükkan izni (time_off) açar.
// MEVCUT randevuları İPTAL ETMEZ (onlar zaten alınmış); yalnızca yeni online
// rezervasyonu durdurur. İstenirse Ayarlar > İzinler'den silinip geri açılır.

/** Bugünün kalanı zaten tüm-dükkan iziyle kapalı mı? (buton durumunu belirler) */
export async function isShopClosedRestOfToday(): Promise<boolean> {
  await requireAdmin();
  const supabase = await createClient();
  const nowISO = new Date().toISOString();
  const { dateISO } = shopNow();
  const endOfToday = shopLocalToUtc(addDaysISO(dateISO, 1), "00:00").toISOString();

  // Şu anı kapsayan ve en az bugün sonuna kadar süren tüm-dükkan izni var mı?
  const { data } = await supabase
    .from("time_off")
    .select("id")
    .is("barber_id", null)
    .lte("starts_at", nowISO)
    .gte("ends_at", endOfToday)
    .limit(1);
  return !!data && data.length > 0;
}

export type CloseTodayResult =
  | { ok: true; alreadyClosed?: boolean }
  | { ok: false; error: string };

export async function closeShopForToday(): Promise<CloseTodayResult> {
  await requireAdmin();
  const supabase = await createClient();

  const now = new Date();
  const { dateISO } = shopNow();
  const endsAt = shopLocalToUtc(addDaysISO(dateISO, 1), "00:00"); // yarın 00:00 (İstanbul)
  if (endsAt.getTime() <= now.getTime()) {
    return { ok: false, error: "Bugün için kapatılacak saat kalmadı." };
  }

  // Zaten kapalıysa tekrar ekleme (mükerrer izin kaydı olmasın).
  const { data: existing, error: readError } = await supabase
    .from("time_off")
    .select("id")
    .is("barber_id", null)
    .lte("starts_at", now.toISOString())
    .gte("ends_at", endsAt.toISOString())
    .limit(1);
  if (readError) {
    console.error("closeShopForToday read:", readError.message);
    return { ok: false, error: "İşlem yapılamadı, tekrar dene." };
  }
  if (existing && existing.length > 0) {
    return { ok: true, alreadyClosed: true };
  }

  const { error } = await supabase.from("time_off").insert({
    barber_id: null,
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: "Bugün kapalı (panelden hızlı kapatma)",
  });
  if (error) {
    console.error("closeShopForToday insert:", error.message);
    return { ok: false, error: "Kapatılamadı, tekrar dene." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ayarlar/izinler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/randevu");
  return { ok: true };
}
