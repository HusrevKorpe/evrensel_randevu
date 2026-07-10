-- ============================================================
--  Faz 5 — Hatırlatma e-postası takibi
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
-- ============================================================

-- Hatırlatma e-postası gönderildiyse zamanı; NULL = henüz gönderilmedi.
-- Cron job (app/api/cron/reminders) bu kolona bakarak aynı randevuya
-- iki kez hatırlatma gitmesini engeller.
alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;

-- Cron'un taradığı "hatırlatılmamış + yaklaşan" sorgusu için kısmi index.
create index if not exists idx_appointments_reminder_due
  on public.appointments (starts_at)
  where reminder_sent_at is null;
