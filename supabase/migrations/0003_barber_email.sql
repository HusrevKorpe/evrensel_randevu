-- ============================================================
--  Faz 7 — Berber bazlı bildirim
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
-- ============================================================

-- 1) Berberin bildirim e-postası. Boşsa bildirimler ADMIN_EMAIL'e düşer.
alter table public.barbers add column if not exists email text;

-- 2) E-posta HERKESE AÇIK OLMASIN.
--    `barbers` tablosu vitrinde göründüğü için "public read" RLS politikası var;
--    ama RLS satır bazlıdır, KOLON gizleyemez. Çözüm: Postgres kolon-seviyesi
--    yetki — anon rolünün tablo-geneli SELECT'ini kaldırıp yalnızca herkese
--    açık kolonları geri veriyoruz. (authenticated = admin, her şeyi görür.)
--    ⚠️ Bu yüzden anon istemciyle `select('*')` artık HATA verir —
--    lib/data.ts kolonları tek tek sayar.
revoke select on public.barbers from anon;
grant select (id, name, title, bio, avatar_url, sort_order, is_active, created_at)
  on public.barbers to anon;

-- 3) Müşteriye hatırlatma maili kaldırıldı (Faz 7 kararı) → kolon gereksiz.
alter table public.appointments drop column if exists reminder_sent_at;

-- PostgREST'in şema önbelleğini tazele (kolon yetkisi değişikliği hemen yansısın).
notify pgrst, 'reload schema';
