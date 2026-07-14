"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import {
  getAvailableTimes,
  pickBarberForSlot,
  type BarberChoice,
} from "@/lib/booking/availability";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HORIZON_DAYS } from "@/lib/booking/config";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import { validateContact, type ContactErrors } from "@/lib/booking/validate";

/**
 * PANELDEN ELLE RANDEVU EKLEME (server action) — telefonla/kapıdan gelen
 * müşteri için. Müşteri sihirbazının (app/randevu/actions.ts) admin ikizi.
 *
 * Müşteri akışından farkları:
 *  • `requireAdmin()` — girişli berber şart (IP/telefon hız freni YOK, güvenilir).
 *  • Randevu doğrudan `confirmed` doğar — berberin kendisi giriyor, onay adımı gereksiz.
 *  • Müşteriye bildirim GÖNDERİLMEZ (berber zaten biliyor; müşteri abone değil).
 *  • INSERT girişli oturumun RLS'li client'ıyla yapılır (en az yetki —
 *    `admin manage appointments` politikası authenticated'a izin verir).
 *
 * Çift randevu yine DB `appointments_no_overlap` kısıtından (SQLSTATE 23P01)
 * engellenir; slot motoruyla önden de eleriz. Girdiye güvenmeyiz: her şey
 * (hizmet varlığı, süre, tarih ufku, boş berber) burada YENİDEN doğrulanır.
 */

// ── Uygun saatleri getir (panel) ────────────────────────────────────────

export type AdminSlotsResult =
  | { ok: true; times: string[] }
  | { ok: false; error: string };

export async function fetchAdminSlots(input: {
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
}): Promise<AdminSlotsResult> {
  await requireAdmin();
  try {
    const { dateISO: today } = shopNow();
    if (input.dateISO < today || input.dateISO > addDaysISO(today, HORIZON_DAYS)) {
      return { ok: true, times: [] };
    }
    const times = await getAvailableTimes(input);
    return { ok: true, times };
  } catch (err) {
    console.error("fetchAdminSlots:", err);
    return { ok: false, error: "Uygun saatler yüklenemedi. Lütfen tekrar dene." };
  }
}

// ── Randevu oluştur (panel) ─────────────────────────────────────────────

export type AdminCreateInput = {
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
  time: string; // "HH:MM"
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type AdminCreateResult =
  | { ok: true; reference: string; barberName: string }
  | {
      ok: false;
      code: "invalid" | "slot_taken" | "error";
      message: string;
      fieldErrors?: ContactErrors;
    };

export async function createAdminAppointment(
  input: AdminCreateInput,
): Promise<AdminCreateResult> {
  await requireAdmin();

  // 1) İletişim bilgisi doğrula + temizle (müşteri akışıyla aynı kurallar).
  const contact = validateContact(input);
  if (!contact.ok) {
    return {
      ok: false,
      code: "invalid",
      message: "Lütfen bilgileri kontrol et.",
      fieldErrors: contact.errors,
    };
  }

  // 2) Hizmet(ler) gerçekten var/aktif mi? Süreyi buradan alırız (istemciye
  //    güvenmeyiz). Süre + birincil hizmet için service-role okuması yeterli.
  const admin = createAdminClient();
  const serviceIds = [...new Set(input.serviceIds ?? [])];
  if (serviceIds.length === 0) {
    return { ok: false, code: "invalid", message: "En az bir hizmet seçmelisin." };
  }
  const { data: services } = await admin
    .from("services")
    .select("id, duration_min, is_active, sort_order")
    .in("id", serviceIds);
  if (
    !services ||
    services.length !== serviceIds.length ||
    services.some((s) => !s.is_active)
  ) {
    return { ok: false, code: "invalid", message: "Seçilen hizmetlerden biri bulunamadı." };
  }
  const totalDuration = services.reduce(
    (sum, s) => sum + (s.duration_min as number),
    0,
  );
  const primaryServiceId = [...services].sort(
    (a, b) => (a.sort_order as number) - (b.sort_order as number),
  )[0].id as string;

  // 3) Tarih ufku içinde mi?
  const { dateISO: today } = shopNow();
  if (input.dateISO < today || input.dateISO > addDaysISO(today, HORIZON_DAYS)) {
    return { ok: false, code: "invalid", message: "Geçersiz tarih seçildi." };
  }

  // 4) Bu slota atanacak boş berberi bul ("Farketmez" → ilk uygun usta).
  const barberId = await pickBarberForSlot({
    serviceIds,
    barberId: input.barberId,
    dateISO: input.dateISO,
    time: input.time,
  });
  if (!barberId) {
    return {
      ok: false,
      code: "slot_taken",
      message: "Bu saat uygun değil ya da dolu. Lütfen başka bir saat seç.",
    };
  }

  // 5) Zaman aralığı + geçmiş kontrolü.
  const startsAt = shopLocalToUtc(input.dateISO, input.time);
  const endsAt = new Date(startsAt.getTime() + totalDuration * 60_000);
  if (startsAt.getTime() <= Date.now()) {
    return { ok: false, code: "invalid", message: "Geçmiş bir saat seçilemez." };
  }

  // 6) Kaydet — girişli berberin RLS'li client'ı (en az yetki). Çift randevu
  //    engeli DB kısıtından (23P01).
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("appointments")
    .insert({
      barber_id: barberId,
      service_id: primaryServiceId,
      customer_name: contact.value.name,
      customer_phone: contact.value.phone,
      customer_email: contact.value.email,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "confirmed",
      notes: contact.value.notes,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        code: "slot_taken",
        message: "Bu saat az önce doldu. Lütfen başka bir saat seç.",
      };
    }
    console.error("createAdminAppointment insert:", error);
    return { ok: false, code: "error", message: "Randevu oluşturulamadı. Lütfen tekrar dene." };
  }

  // 6b) Seçilen TÜM hizmetleri ara tabloya yaz. Hata olursa randevuyu geri al.
  const { error: linkError } = await supabase.from("appointment_services").insert(
    serviceIds.map((service_id) => ({
      appointment_id: created.id as string,
      service_id,
    })),
  );
  if (linkError) {
    console.error("createAdminAppointment link:", linkError);
    await supabase.from("appointments").delete().eq("id", created.id as string);
    return { ok: false, code: "error", message: "Randevu oluşturulamadı. Lütfen tekrar dene." };
  }

  // Atanan berberin adı (başarı ekranı için).
  const { data: barber } = await supabase
    .from("barbers")
    .select("name")
    .eq("id", barberId)
    .maybeSingle();

  // Panel, takvim, geçmiş ve vitrin müsaitliği tazelensin.
  revalidatePath("/admin");
  revalidatePath("/admin/randevular");
  revalidatePath("/admin/takvim");
  revalidatePath("/admin/gecmis");
  revalidatePath("/randevu");

  const reference = (created.id as string).slice(0, 8).toUpperCase();
  return { ok: true, reference, barberName: barber?.name ?? "Usta" };
}
