-- ============================================================
--  Berber Randevu — Veritabanı Şeması (Faz 1)
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
-- ============================================================

-- Çakışan randevu engeli (exclusion constraint) için gerekli eklenti:
create extension if not exists btree_gist;

-- ------------------------------------------------------------
--  HİZMETLER
-- ------------------------------------------------------------
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  duration_min integer not null check (duration_min > 0 and duration_min <= 600),
  price        integer not null check (price >= 0),   -- TL cinsinden (tam sayı)
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
--  BERBERLER (personel)
-- ------------------------------------------------------------
create table if not exists public.barbers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  title       text,
  bio         text,
  avatar_url  text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  ÇALIŞMA SAATLERİ
--  weekday: 0=Pazar, 1=Pazartesi ... 6=Cumartesi (Postgres dow ile uyumlu)
--  Bir satır = o berber o gün AÇIK. Satır yoksa o gün KAPALI.
-- ------------------------------------------------------------
create table if not exists public.working_hours (
  id          uuid primary key default gen_random_uuid(),
  barber_id   uuid not null references public.barbers(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  break_start time,   -- öğle arası başlangıcı (opsiyonel)
  break_end   time,   -- öğle arası bitişi (opsiyonel)
  check (end_time > start_time),
  check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null
        and break_end > break_start
        and break_start >= start_time and break_end <= end_time)
  ),
  unique (barber_id, weekday)
);

-- ------------------------------------------------------------
--  İZİN / KAPALI ZAMANLAR
--  barber_id NULL ise TÜM dükkan kapalı (ör. bayram tatili).
-- ------------------------------------------------------------
create table if not exists public.time_off (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references public.barbers(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ------------------------------------------------------------
--  RANDEVULAR
-- ------------------------------------------------------------
create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  barber_id      uuid not null references public.barbers(id) on delete restrict,
  service_id     uuid not null references public.services(id) on delete restrict,
  customer_name  text not null,
  customer_phone text not null,
  customer_email text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','cancelled','completed','no_show')),
  notes          text,
  created_at     timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Aynı berbere ÇAKIŞAN randevu engeli (iptaller hariç).
-- Bu, çift randevuyu VERİTABANI seviyesinde imkânsız kılar — en güçlü koruma.
alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled');

-- Sık sorgular için indexler
create index if not exists idx_appointments_barber_start on public.appointments (barber_id, starts_at);
create index if not exists idx_appointments_status       on public.appointments (status);
create index if not exists idx_time_off_range            on public.time_off (starts_at, ends_at);
create index if not exists idx_working_hours_barber      on public.working_hours (barber_id, weekday);

-- ============================================================
--  RLS (Row Level Security) — kim neyi görebilir/değiştirebilir
-- ============================================================
alter table public.services      enable row level security;
alter table public.barbers       enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off      enable row level security;
alter table public.appointments  enable row level security;

-- Herkes (ziyaretçi) OKUYABİLİR: hizmetler, berberler, saatler, izinler
drop policy if exists "public read services" on public.services;
create policy "public read services" on public.services for select using (true);

drop policy if exists "public read barbers" on public.barbers;
create policy "public read barbers" on public.barbers for select using (true);

drop policy if exists "public read working_hours" on public.working_hours;
create policy "public read working_hours" on public.working_hours for select using (true);

drop policy if exists "public read time_off" on public.time_off;
create policy "public read time_off" on public.time_off for select using (true);

-- YAZMA (ekle/güncelle/sil) yalnızca giriş yapmış admin (berber) için
drop policy if exists "admin write services" on public.services;
create policy "admin write services" on public.services
  for all to authenticated using (true) with check (true);

drop policy if exists "admin write barbers" on public.barbers;
create policy "admin write barbers" on public.barbers
  for all to authenticated using (true) with check (true);

drop policy if exists "admin write working_hours" on public.working_hours;
create policy "admin write working_hours" on public.working_hours
  for all to authenticated using (true) with check (true);

drop policy if exists "admin write time_off" on public.time_off;
create policy "admin write time_off" on public.time_off
  for all to authenticated using (true) with check (true);

-- RANDEVULAR:
--  • Ziyaretçi yalnızca YENİ randevu oluşturabilir (status='pending', gelecekte).
--  • Ziyaretçi başkasının randevusunu OKUYAMAZ (PII koruması).
--  • Admin (giriş yapmış) her şeyi görür/yönetir.
drop policy if exists "public create appointment" on public.appointments;
create policy "public create appointment" on public.appointments
  for insert to anon
  with check (status = 'pending' and starts_at > now());

drop policy if exists "admin manage appointments" on public.appointments;
create policy "admin manage appointments" on public.appointments
  for all to authenticated using (true) with check (true);

-- ============================================================
--  ÖRNEK VERİ (seed) — yalnızca tablolar BOŞSA eklenir.
--  Gerçek dükkan bilgilerinle sonra değiştirebilirsin.
-- ============================================================
do $$
declare
  b1 uuid;
  b2 uuid;
  wd smallint;
begin
  -- Hizmetler
  if not exists (select 1 from public.services) then
    insert into public.services (name, description, duration_min, price, sort_order) values
      ('Saç Kesimi',        'Makas veya makine ile profesyonel saç kesimi', 30, 250, 1),
      ('Saç + Sakal',       'Saç kesimi ve sakal şekillendirme birlikte',   45, 350, 2),
      ('Sakal Tıraşı',      'Ustura/makine ile sakal düzenleme',            20, 150, 3),
      ('Çocuk Saç Kesimi',  '12 yaş altı için saç kesimi',                  25, 200, 4),
      ('Yüz Bakımı / Ağda', 'Yüz temizliği ve ağda',                        20, 180, 5),
      ('Saç Boyama',        'Profesyonel saç boyama',                       60, 500, 6);
  end if;

  -- Berberler + çalışma saatleri
  if not exists (select 1 from public.barbers) then
    insert into public.barbers (name, title, bio, sort_order)
      values ('Ahmet Usta', 'Kurucu Berber', '15 yıllık deneyimli usta.', 1)
      returning id into b1;
    insert into public.barbers (name, title, bio, sort_order)
      values ('Mehmet Usta', 'Berber', 'Modern kesim ve sakal uzmanı.', 2)
      returning id into b2;

    -- Pazartesi–Cuma (1..5): 10:00–20:00, öğle arası 13:00–14:00
    foreach wd in array array[1,2,3,4,5]::smallint[] loop
      insert into public.working_hours (barber_id, weekday, start_time, end_time, break_start, break_end)
      values (b1, wd, '10:00', '20:00', '13:00', '14:00'),
             (b2, wd, '10:00', '20:00', '13:00', '14:00');
    end loop;

    -- Cumartesi (6): 10:00–18:00, mola yok. Pazar (0): kapalı (satır yok).
    insert into public.working_hours (barber_id, weekday, start_time, end_time)
    values (b1, 6, '10:00', '18:00'),
           (b2, 6, '10:00', '18:00');
  end if;
end $$;
