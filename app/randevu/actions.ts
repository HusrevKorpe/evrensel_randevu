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
import { buildTrackingLink } from "@/lib/notifications/approval-token";
import { HORIZON_DAYS } from "@/lib/booking/config";
import { addDaysISO, shopLocalToUtc, shopNow } from "@/lib/booking/time";
import { validateContact, type ContactErrors } from "@/lib/booking/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// ── Uygun saatleri getir ───────────────────────────────────────────────

export type SlotsResult =
  | { ok: true; times: string[] }
  | { ok: false; error: string };

export async function fetchSlotsAction(input: {
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
}): Promise<SlotsResult> {
  try {
    // Hız freni: saat sorgusu göz atarken sık çağrılır, o yüzden cömert
    // (IP başına 60/dk). Amaç normal kullanımı engellemek değil, ucu döngüde
    // dövmeyi durdurmak.
    const rl = rateLimit(`slots:${await clientIp()}`, 60, 60_000);
    if (!rl.ok) {
      return { ok: false, error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." };
    }

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
  serviceIds: string[];
  barberId: BarberChoice;
  dateISO: string;
  time: string; // "HH:MM"
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type CreateResult =
  | { ok: true; reference: string; barberName: string; trackUrl: string | null }
  | {
      ok: false;
      code: "invalid" | "slot_taken" | "error";
      message: string;
      fieldErrors?: ContactErrors;
    };

export async function createAppointmentAction(
  input: CreateInput,
): Promise<CreateResult> {
  // 0) Hız freni (IP başına): asıl spam yüzeyi burasıdır. Meşru kullanıcı
  //    10 dakikada 10 kez randevu oluşturmaz; script'li seli durdurur.
  const ipLimit = rateLimit(`book-ip:${await clientIp()}`, 10, 10 * 60_000);
  if (!ipLimit.ok) {
    return {
      ok: false,
      code: "error",
      message: "Çok fazla deneme yaptın. Lütfen birkaç dakika sonra tekrar dene.",
    };
  }

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

  // 1b) Hız freni (telefon başına): IP döndürülse bile aynı numarayla
  //     seri randevuyu sınırla (saatte 5). Numara doğrulanıp normalize edildi.
  const phoneLimit = rateLimit(`book-phone:${contact.value.phone}`, 5, 60 * 60_000);
  if (!phoneLimit.ok) {
    return {
      ok: false,
      code: "error",
      message: "Bu numarayla çok fazla randevu oluşturdun. Lütfen daha sonra tekrar dene.",
    };
  }

  const admin = createAdminClient();

  // 2) Hizmet(ler) gerçekten var/aktif mi? Süreyi buradan alırız (istemciye
  //    güvenmeyiz). Tekrarları ayıkla; en az bir geçerli hizmet olmalı.
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
  // Birincil hizmet = sıra numarası en küçük olan (appointments.service_id).
  const primaryServiceId = [...services].sort(
    (a, b) => (a.sort_order as number) - (b.sort_order as number),
  )[0].id as string;

  // 3) Tarih ufku içinde mi?
  const { dateISO: today } = shopNow();
  if (input.dateISO < today || input.dateISO > addDaysISO(today, HORIZON_DAYS)) {
    return { ok: false, code: "invalid", message: "Geçersiz tarih seçildi." };
  }

  // 4) Bu slota atanacak boş berberi bul ("Farketmez" → ilk uygun usta)
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
      message: "Bu saat az önce doldu. Lütfen başka bir saat seç.",
    };
  }

  // 5) Zaman aralığını hesapla ve geçmiş olmadığını doğrula
  const startsAt = shopLocalToUtc(input.dateISO, input.time);
  const endsAt = new Date(startsAt.getTime() + totalDuration * 60_000);
  if (startsAt.getTime() <= Date.now()) {
    return { ok: false, code: "invalid", message: "Geçmiş bir saat seçilemez." };
  }

  // 6) Kaydet. Çift randevu engeli VERİTABANI kısıtından gelir (exclusion,
  //    SQLSTATE 23P01): iki kişi aynı anda aynı saati alsa biri hata alır.
  const { data: created, error } = await admin
    .from("appointments")
    .insert({
      barber_id: barberId,
      service_id: primaryServiceId,
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

  // 6b) Seçilen TÜM hizmetleri ara tabloya yaz (görüntüleme buradan okur).
  //     Başarısız olursa randevuyu geri al ki "yarım" kayıt kalmasın.
  const { error: linkError } = await admin.from("appointment_services").insert(
    serviceIds.map((service_id) => ({
      appointment_id: created.id as string,
      service_id,
    })),
  );
  if (linkError) {
    console.error("createAppointmentAction link:", linkError);
    await admin.from("appointments").delete().eq("id", created.id as string);
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
  // Müşteri durumunu canlı izleyebilsin: imzalı takip linki.
  const trackUrl = buildTrackingLink(created.id as string, startsAt.toISOString());
  return { ok: true, reference, barberName: barber?.name ?? "Ustanız", trackUrl };
}
