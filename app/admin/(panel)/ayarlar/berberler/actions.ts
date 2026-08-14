"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Berber yönetimi server action'ları (ekle / düzenle / sil / aktif-pasif /
 * sırala) + bildirim e-postası kaydetme.
 *
 * Güvenlik: server action'lar UI dışından da çağrılabilir → `requireAdmin()`
 * ile burada TEKRAR doğrularız. Yazma, girişli oturumun RLS'li istemcisiyle
 * yapılır ("admin write barbers" politikası) — service-role gerekmez.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SaveBarberEmailResult = { ok: boolean; error?: string };

export type BarberActionResult = { ok: boolean; error?: string };

export type BarberInput = {
  name: string;
  title: string;
  bio: string;
};

function validateBarber(input: BarberInput): string | null {
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 80)
    return "Berber adı 2–80 karakter olmalı.";
  if ((input.title ?? "").length > 80)
    return "Ünvan en fazla 80 karakter olabilir.";
  if ((input.bio ?? "").length > 300)
    return "Açıklama en fazla 300 karakter olabilir.";
  return null;
}

/** Değişiklik hem panelde hem vitrinde/randevuda görünsün. */
function revalidateBarbers() {
  revalidatePath("/admin/ayarlar/berberler");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/admin/ayarlar/saatler");
  revalidatePath("/");
  revalidatePath("/randevu");
}

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

/**
 * Yeni berber ekler ve ÇALIŞMA SAATLERİNİ mevcut bir berberden kopyalar.
 *
 * Kopyalama şart: `working_hours`ta bir satır = "o berber o gün AÇIK",
 * satır yoksa gün KAPALI sayılır. Saatsiz eklenen berber vitrinde görünür
 * ama hiçbir saati açılmaz, kimse randevu alamaz — sessiz bir tuzak.
 * Dükkan şeması zaten tüm berberlerde aynı (bkz. saveWorkingHours), o yüzden
 * herhangi bir berberin satırlarını kopyalamak doğru sonucu verir.
 *
 * Saat kopyalama başarısız olursa berber yine de eklenir (geri alınmaz) —
 * kullanıcıya "Çalışma Saatleri'nden Kaydet'e bas" diye söyleriz.
 */
export async function createBarber(
  input: BarberInput,
): Promise<BarberActionResult> {
  await requireAdmin();

  const invalid = validateBarber(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Yeni berber listenin sonuna eklensin.
  const { data: maxRow } = await supabase
    .from("barbers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Saatleri kopyalayacağımız referans berber (varsa) — eklemeden ÖNCE seç,
  // yoksa yeni (saatsiz) berberin kendisi gelir.
  const { data: refBarber } = await supabase
    .from("barbers")
    .select("id")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("barbers")
    .insert({
      name: input.name.trim(),
      title: input.title.trim() || null,
      bio: input.bio.trim() || null,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("createBarber:", error?.message);
    return { ok: false, error: "Berber eklenemedi, tekrar deneyin." };
  }

  if (refBarber?.id) {
    const { data: hours } = await supabase
      .from("working_hours")
      .select("weekday, start_time, end_time, break_start, break_end")
      .eq("barber_id", refBarber.id);

    if (hours?.length) {
      const { error: hoursError } = await supabase
        .from("working_hours")
        .insert(hours.map((h) => ({ ...h, barber_id: created.id })));

      if (hoursError) {
        console.error("createBarber saatler:", hoursError.message);
        revalidateBarbers();
        return {
          ok: false,
          error:
            "Berber eklendi ama çalışma saatleri kopyalanamadı. Ayarlar → Çalışma Saatleri'nde Kaydet'e bas.",
        };
      }
    }
  }

  revalidateBarbers();
  return { ok: true };
}

export async function updateBarber(
  id: string,
  input: BarberInput,
): Promise<BarberActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Berber bulunamadı." };
  const invalid = validateBarber(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbers")
    .update({
      name: input.name.trim(),
      title: input.title.trim() || null,
      bio: input.bio.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("updateBarber:", error.message);
    return { ok: false, error: "Berber güncellenemedi, tekrar deneyin." };
  }
  revalidateBarbers();
  return { ok: true };
}

export async function deleteBarber(id: string): Promise<BarberActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Berber bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase.from("barbers").delete().eq("id", id);

  if (error) {
    // 23503 = foreign key ihlali → bu berbere bağlı randevular var
    // (appointments.barber_id "on delete restrict"). GEÇMİŞ randevular da
    // sayılır; silinseydi o kayıtlar ustasız kalırdı. Doğrusu pasife almak.
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Bu berbere ait randevular var; silinemez. Bunun yerine pasife alabilirsin — vitrinden ve randevu akışından düşer, geçmiş kayıtlar bozulmaz.",
      };
    }
    console.error("deleteBarber:", error.message);
    return { ok: false, error: "Berber silinemedi, tekrar deneyin." };
  }
  revalidateBarbers();
  return { ok: true };
}

export async function toggleBarberActive(
  id: string,
  isActive: boolean,
): Promise<BarberActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "Berber bulunamadı." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbers")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("toggleBarberActive:", error.message);
    return { ok: false, error: "Durum değiştirilemedi, tekrar deneyin." };
  }
  revalidateBarbers();
  return { ok: true };
}

/**
 * Berberi listede bir üst/alt sıraya taşır (komşuyla sort_order takası).
 * Sıra sadece görsel değil: müşteri "farketmez" derse o saatte boş olan
 * EN ÜSTTEKİ berber atanır (pickBarberForSlot).
 */
export async function moveBarber(
  id: string,
  direction: "up" | "down",
): Promise<BarberActionResult> {
  await requireAdmin();
  if (!id || (direction !== "up" && direction !== "down"))
    return { ok: false, error: "Geçersiz istek." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbers")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("moveBarber:", error?.message);
    return { ok: false, error: "Sıralama okunamadı, tekrar deneyin." };
  }

  const idx = data.findIndex((b) => b.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= data.length)
    return { ok: true }; // zaten en uçta — sessizce geç

  // İkiliyi bellek içinde takas et, sonra TÜM listeyi 1..n yeniden numaralandır.
  const list = [...data];
  [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
  const updates = list
    .map((b, i) => ({ id: b.id, order: i + 1, prev: b.sort_order }))
    .filter((u) => u.order !== u.prev);

  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("barbers").update({ sort_order: u.order }).eq("id", u.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("moveBarber:", failed.error?.message);
    return { ok: false, error: "Sıralama değiştirilemedi, tekrar deneyin." };
  }
  revalidateBarbers();
  return { ok: true };
}
