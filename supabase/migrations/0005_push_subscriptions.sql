-- ============================================================
--  0005 — Web Push abonelikleri (Faz 8)
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
--
--  E-POSTAYA DOKUNMAZ. Push, e-postanın YANINA gelen ikinci kanaldır.
--  Bir "abonelik" = bir tarayıcının push adresi (endpoint) + şifreleme
--  anahtarları. Bunları saklarız ki randevu durumu değişince o tarayıcıya
--  sinyal gönderebilelim (site kapalı olsa bile bildirim düşer).
-- ============================================================

create table if not exists public.push_subscriptions (
  id             uuid primary key default gen_random_uuid(),

  -- Kime ait bu abonelik?
  --   'customer' → bir MÜŞTERİ, TEK randevusunu takip için izin verdi
  --                (appointment_id dolu; randevu silinince abonelik de gider).
  --   'staff'    → bir BERBER/SAHİP, panelde "bu cihaza bildirim" dedi
  --                (barber_id eşleşen berber, ya da NULL = sahip cihazı →
  --                 tüm yeni randevuları alır).
  audience       text not null check (audience in ('customer', 'staff')),

  appointment_id uuid references public.appointments(id) on delete cascade,
  barber_id      uuid references public.barbers(id)      on delete cascade,

  -- Tarayıcının ürettiği push adresi + şifreleme anahtarları (PushSubscription).
  -- endpoint benzersizdir: aynı tarayıcı tekrar abone olursa ESKİYİ günceller.
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Müşteri aboneliği MUTLAKA bir randevuya bağlı olmalı (kime bildirim
  -- atacağımız oradan gelir). Personel aboneliğinde şart değil.
  constraint push_customer_needs_appointment
    check (audience <> 'customer' or appointment_id is not null)
);

-- Gönderim sorguları için indexler: "bu randevunun müşteri aboneleri" /
-- "bu berberin (ve sahip) abonelikleri".
create index if not exists idx_push_subs_appointment
  on public.push_subscriptions (appointment_id) where appointment_id is not null;
create index if not exists idx_push_subs_barber
  on public.push_subscriptions (audience, barber_id);

-- ------------------------------------------------------------
--  RLS — tablo TAMAMEN kilitli.
--  Push adresleri hassastır; ziyaretçi/anon ne okur ne yazar. Tüm erişim
--  yalnızca SUNUCU tarafındaki server action'lardan, service-role istemciyle
--  yapılır (kapıyı imzalı token / admin oturumu açar, RLS değil — mevcut
--  randevu onay akışıyla aynı desen). Politika EKLEMİYORUZ: RLS açık + politika
--  yok = anon'a kapalı; service-role zaten RLS'i bypass eder.
-- ------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

-- PostgREST şema önbelleğini tazele (yeni tablo hemen görünsün).
notify pgrst, 'reload schema';
