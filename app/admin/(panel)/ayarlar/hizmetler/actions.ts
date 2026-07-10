"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Hizmet yönetimi server action'ları.
 *
 * Güvenlik: her action `requireAdmin()` ile başlar (UI dışı çağrıya karşı)
 * ve girdiyi burada YENİDEN doğrular. Yazma, girişli berberin RLS'li server
 * istemcisiyle yapılır (service-role değil — en az yetki).
 */

export type ServiceActionResult = { ok: boolean; error?: string };

export type ServiceInput = {
  name: string;
  description: string;
  duration_min: number;
  price: number;
};

/** Fiyat/süre sınırları DB check kısıtlarıyla uyumlu (0001_init.sql). */
function validateService(input: ServiceInput): string | null {
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 80)
    return "Hizmet adı 2–80 karakter olmalı.";
  if ((input.description ?? "").length > 300)
    return "Açıklama en fazla 300 karakter olabilir.";
  const dur = Number(input.duration_min);
  if (!Number.isInteger(dur) || dur < 5 || dur > 600)
    return "Süre 5 ile 600 dakika arasında olmalı.";
  const price = Number(input.price);
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000)
    return "Geçerli bir fiyat gir (0 veya üstü, tam sayı).";
  return null;
}

/** Değişiklik hem panelde hem vitrinde/randevuda görünsün. */
function revalidateServices() {
  revalidatePath("/admin/ayarlar/hizmetler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/");
  revalidatePath("/randevu");
}

export async function createService(
  input: ServiceInput,
): Promise<ServiceActionResult> {
  await requireAdmin();

  const invalid = validateService(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Yeni hizmet listenin sonuna eklensin.
  const { data: maxRow } = await supabase
    .from("services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("services").insert({
    name: input.name.trim(),
    description: input.description.trim() || null,
    duration_min: Number(input.duration_min),
    price: Number(input.price),
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });

  if (error) {
    console.error("createService:", error.message);
    return { ok: false, error: "Hizmet eklenemedi, tekrar deneyin." };
  }
  revalidateServices();
  return { ok: true };
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<ServiceActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Hizmet bulunamadı." };
  const invalid = validateService(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      duration_min: Number(input.duration_min),
      price: Number(input.price),
    })
    .eq("id", id);

  if (error) {
    console.error("updateService:", error.message);
    return { ok: false, error: "Hizmet güncellenemedi, tekrar deneyin." };
  }
  revalidateServices();
  return { ok: true };
}

export async function deleteService(id: string): Promise<ServiceActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Hizmet bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    // 23503 = foreign key ihlali → bu hizmete bağlı randevular var
    // (appointments.service_id "on delete restrict"). Silmek yerine pasife al.
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Bu hizmete bağlı randevular var; silinemez. Bunun yerine pasife alabilirsin.",
      };
    }
    console.error("deleteService:", error.message);
    return { ok: false, error: "Hizmet silinemedi, tekrar deneyin." };
  }
  revalidateServices();
  return { ok: true };
}

export async function toggleServiceActive(
  id: string,
  isActive: boolean,
): Promise<ServiceActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Hizmet bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("toggleServiceActive:", error.message);
    return { ok: false, error: "Durum değiştirilemedi, tekrar deneyin." };
  }
  revalidateServices();
  return { ok: true };
}

/** Hizmeti listede bir üst/alt sıraya taşır (komşuyla sort_order takası). */
export async function moveService(
  id: string,
  direction: "up" | "down",
): Promise<ServiceActionResult> {
  await requireAdmin();
  if (!id || (direction !== "up" && direction !== "down"))
    return { ok: false, error: "Geçersiz istek." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("moveService:", error?.message);
    return { ok: false, error: "Sıralama okunamadı, tekrar deneyin." };
  }

  const idx = data.findIndex((s) => s.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= data.length)
    return { ok: true }; // zaten en uçta — sessizce geç

  // İkiliyi bellek içinde takas et, sonra TÜM listeyi 1..n yeniden numaralandır.
  // (Eşit sort_order'lı eski kayıtlar da böylece düzelir.)
  const list = [...data];
  [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
  const updates = list
    .map((s, i) => ({ id: s.id, order: i + 1, prev: s.sort_order }))
    .filter((u) => u.order !== u.prev);

  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("services").update({ sort_order: u.order }).eq("id", u.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("moveService:", failed.error?.message);
    return { ok: false, error: "Sıralama değiştirilemedi, tekrar deneyin." };
  }
  revalidateServices();
  return { ok: true };
}
