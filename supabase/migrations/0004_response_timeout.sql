-- ============================================================
--  0004 — Randevu yanıt zaman aşımı + iptal nedeni
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyayı yapıştır > Run.
--  Tekrar çalıştırmak güvenlidir (idempotent).
-- ============================================================

-- İptal edilen randevunun NEDENİNİ tutarız ki müşteri takip sayfasında
-- doğru (yumuşak) mesajı gösterelim:
--   • null       → elle iptal / usta reddi (mevcut davranış)
--   • 'timeout'  → usta süresinde yanıtlamadı → sistem otomatik iptal etti
--
-- Not: STATUS enum'una DOKUNMUYORUZ. Zaman aşımı da statü olarak
-- 'cancelled'dır (slot boşalsın, çakışma kısıtı gevşesin); yalnızca nedeni
-- bu kolonla ayrışır. Böylece panel/takvim mantığı hiç etkilenmez.
alter table public.appointments
  add column if not exists cancel_reason text;

comment on column public.appointments.cancel_reason is
  'İptal/red nedeni: null=elle iptal veya usta reddi, ''timeout''=usta süresinde yanıtlamadı (otomatik).';
