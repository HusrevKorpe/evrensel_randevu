-- ============================================================
--  Berber Randevu — Çoklu hizmet (Faz 9)
--  Bir randevuya birden fazla hizmet seçilebilsin.
--
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
--
--  Tasarım: appointments.service_id "BİRİNCİL hizmet" olarak KALIR
--  (eski kayıtlar ve yabancı anahtar bozulmasın). Seçilen tüm hizmetler
--  bu ara tabloda tutulur — görüntüleme katmanı birleşik isim üretir,
--  randevu süresi = seçilen hizmetlerin süreleri toplamı.
-- ============================================================

-- ------------------------------------------------------------
--  RANDEVU ↔ HİZMET (ara / bağlantı tablosu)
--  Bir satır = bu randevuda bu hizmet var.
-- ------------------------------------------------------------
create table if not exists public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id     uuid not null references public.services(id)     on delete restrict,
  primary key (appointment_id, service_id)
);

-- Bir randevunun hizmetlerini hızlı çekmek için.
create index if not exists idx_appointment_services_appt
  on public.appointment_services (appointment_id);

-- ------------------------------------------------------------
--  RLS — appointments ile aynı mantık.
--  Yazma yalnızca sunucudan service-role (RLS'i baypaslar) ile yapılır;
--  girişli admin okuyup yönetebilir. Ziyaretçi (anon) doğrudan erişemez.
-- ------------------------------------------------------------
alter table public.appointment_services enable row level security;

drop policy if exists "admin manage appointment_services" on public.appointment_services;
create policy "admin manage appointment_services" on public.appointment_services
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
--  GERİYE DÖNÜK DOLDURMA (backfill)
--  Mevcut randevuların birincil hizmetini ara tabloya taşı ki
--  eski kayıtlar da yeni görüntüleme yolundan doğru görünsün.
-- ------------------------------------------------------------
insert into public.appointment_services (appointment_id, service_id)
select id, service_id from public.appointments
on conflict do nothing;
