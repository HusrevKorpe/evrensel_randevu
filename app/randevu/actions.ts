"use server";

/**
 * Randevu akışının SUNUCU eylemleri (Server Actions).
 * İstemci bu fonksiyonları ağ üzerinden çağırır. Bu dosyadaki her şey
 * sunucuda çalışır → gizli anahtarlar ve DB mantığı istemciye sızmaz.
 *
 * ⚠️ Güvenlik: Server Action'lar UI dışından da (doğrudan POST) çağrılabilir.
 * Bu yüzden GİRDİYE ASLA GÜVENMEYİZ — her şeyi burada yeniden doğrularız.
 */

import { after } from "next/server";
import {
  getAvailableTimes,
  pickBarberForSlot,
  type BarberChoice,
} from "@/lib/booking/availability";
import { notifyCreated } from "@/lib/notifications/appointments";
import { HORIZON_DAYS } from "@/lib/booking/config";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import { validateContact, type ContactErrors } from "@/lib/booking/validate";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Uygun saatleri getir ───────────────────────────────────────────────

export type SlotsResult =
  | { ok: true; times: string[] }
  | { ok: false; error: string };

export async function fetchSlotsAction(input: {
  serviceId: string;
  barberId: BarberChoice;
  dateISO: string;
}): Promise<SlotsResult> {
  try {
    // Tarih ufku dışındaki istekleri boş dön.
    const { dateISO: today } = shopNow();
    if (input.dateISO < today || input.dateISO > addDaysISO(today, HORIZON_DAYS)) {
      return { ok: true, times: [] };
    }
    const times = await getAvailableTimes(input);
    return { ok: true, times };
  } catch (err) {
    console.error("fetchSlotsAction:", err);
    return { ok: false, error: "Uygun saatler yüklenemedi. Lütfen tekrar dene." };
  }
}

// ── Randevu oluştur ────────────────────────────────────────────────────

export type CreateInput = {
  serviceId: string;
  barberId: BarberChoice;
  dateISO: string;
  time: string; // "HH:MM"
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type CreateResult =
  | { ok: true; reference: string; barberName: string }
  | {
      ok: false;
      code: "invalid" | "slot_taken" | "error";
      message: string;
      fieldErrors?: ContactErrors;
    };

export async function createAppointmentAction(
  input: CreateInput,
): Promise<CreateResult> {
  // 1) İletişim bilgisi doğrula + temizle
  const contact = validateContact(input);
  if (!contact.ok) {
    return {
      ok: false,
      code: "invalid",
      message: "Lütfen bilgileri kontrol et.",
      fieldErrors: contact.errors,
    };
  }

  const admin = createAdminClient();

  // 2) Hizmet gerçekten var/aktif mi? (süreyi buradan alırız, istemciye güvenmeyiz)
  const { data: service } = await admin
    .from("services")
    .select("id, duration_min, is_active")
    .eq("id", input.serviceId)
    .maybeSingle();
  if (!service || !service.is_active) {
    return { ok: false, code: "invalid", message: "Seçilen hizmet bulunamadı." };
  }

  // 3) Tarih ufku içinde mi?
  const { dateISO: today } = shopNow();
  if (input.dateISO < today || input.dateISO > addDaysISO(today, HORIZON_DAYS)) {
    return { ok: false, code: "invalid", message: "Geçersiz tarih seçildi." };
  }

  // 4) Bu slota atanacak boş berberi bul ("Farketmez" → ilk uygun usta)
  const barberId = await pickBarberForSlot({
    serviceId: input.serviceId,
    barberId: input.barberId,
    dateISO: input.dateISO,
    time: input.time,
  });
  if (!barberId) {
    return {
      ok: false,
      code: "slot_taken",
      message: "Bu saat az önce doldu. Lütfen başka bir saat seç.",
    };
  }

  // 5) Zaman aralığını hesapla ve geçmiş olmadığını doğrula
  const startsAt = shopLocalToUtc(input.dateISO, input.time);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
  if (startsAt.getTime() <= Date.now()) {
    return { ok: false, code: "invalid", message: "Geçmiş bir saat seçilemez." };
  }

  // 6) Kaydet. Çift randevu engeli VERİTABANI kısıtından gelir (exclusion,
  //    SQLSTATE 23P01): iki kişi aynı anda aynı saati alsa biri hata alır.
  const { data: created, error } = await admin
    .from("appointments")
    .insert({
      barber_id: barberId,
      service_id: service.id,
      customer_name: contact.value.name,
      customer_phone: contact.value.phone,
      customer_email: contact.value.email,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending",
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
    console.error("createAppointmentAction insert:", error);
    return {
      ok: false,
      code: "error",
      message: "Randevu oluşturulamadı. Lütfen tekrar dene.",
    };
  }

  // Bildirimler yanıtı BEKLETMESİN: `after` müşteriye cevap gittikten sonra
  // çalışır. E-posta hatası randevuyu etkilemez (içeride yakalanır).
  after(() => notifyCreated(created.id as string));

  // Atanan berberin adını başarı ekranı için çekelim ("Farketmez"te önemli).
  const { data: barber } = await admin
    .from("barbers")
    .select("name")
    .eq("id", barberId)
    .maybeSingle();

  // İnsan-dostu referans: UUID'nin ilk 8 hanesi. Örn. "A1B2C3D4"
  const reference = (created.id as string).slice(0, 8).toUpperCase();
  return { ok: true, reference, barberName: barber?.name ?? "Ustanız" };
}
