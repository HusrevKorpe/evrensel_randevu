/**
 * Uygulama genelinde paylaşılan veri tipleri.
 * Veritabanı tablolarıyla birebir eşleşir (supabase/migrations/0001_init.sql).
 */

export type UUID = string;
/** ISO 8601 tarih-saat string'i (ör. "2026-07-10T13:00:00Z") */
export type Timestamp = string;

/** Randevu durumları */
export type AppointmentStatus =
  | "pending" // bekliyor (yeni oluşturuldu)
  | "confirmed" // onaylandı
  | "cancelled" // iptal edildi
  | "completed" // tamamlandı
  | "no_show"; // müşteri gelmedi

/** Hizmet (saç kesimi, sakal vs.) */
export interface Service {
  id: UUID;
  name: string;
  description: string | null;
  duration_min: number; // hizmet süresi (dakika) — slot hesabında kullanılır
  price: number; // fiyat (TL)
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
}

/** Berber / personel */
export interface Barber {
  id: UUID;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Timestamp;
}

/**
 * Çalışma saati. Bir satır = o berber o gün AÇIK.
 * weekday: 0=Pazar, 1=Pazartesi ... 6=Cumartesi
 * Saatler "HH:MM:SS" formatında time değerleridir.
 */
export interface WorkingHour {
  id: UUID;
  barber_id: UUID;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

/** İzin / kapalı zaman aralığı. barber_id null ise tüm dükkan kapalı. */
export interface TimeOff {
  id: UUID;
  barber_id: UUID | null;
  starts_at: Timestamp;
  ends_at: Timestamp;
  reason: string | null;
  created_at: Timestamp;
}

/** Randevu */
export interface Appointment {
  id: UUID;
  barber_id: UUID;
  service_id: UUID;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: Timestamp;
  ends_at: Timestamp;
  status: AppointmentStatus;
  notes: string | null;
  created_at: Timestamp;
}
