-- ============================================================
--  0007 — Anon "randevu oluştur" politikasını KALDIR (güvenlik sıkılaştırma)
--  Kullanım: Supabase Dashboard > SQL Editor > bu dosyanın TAMAMINI
--           yapıştır > "Run". Tekrar çalıştırmak güvenlidir (idempotent).
--
--  NEDEN?
--  0001'de şu politika vardı:
--      create policy "public create appointment" on public.appointments
--        for insert to anon with check (status='pending' and starts_at>now());
--
--  `NEXT_PUBLIC_SUPABASE_ANON_KEY` tarayıcıya gider (gitmesi normal). Bu
--  politika yüzünden biri, sunucudaki `createAppointmentAction`'ı HİÇ
--  kullanmadan, doğrudan PostgREST'e istek atıp veritabanına randevu
--  BASABİLİYORDU. Tek şart "pending + gelecek tarih" olduğundan; uydurma
--  isim/telefon/berber ile panele çöp randevu düşürmek, gelecekteki slotları
--  doldurup müsaitliği DoS'lamak ve her eklemede tetiklenen e-posta/push ile
--  bildirim spam'i yapmak mümkündü.
--
--  GÜVENLİ Mİ? EVET. Gerçek randevu akışı (`app/randevu/actions.ts` →
--  `createAdminClient`) SERVICE-ROLE anahtarıyla çalışır ve RLS'i bypass eder;
--  bu anon politikasına HİÇ ihtiyacı yoktur. Politikayı silmek yalnızca arka
--  kapıyı kapatır, normal akışı etkilemez. (push_subscriptions ile aynı desen:
--  RLS açık + anon politikası yok = anon'a kapalı, sunucu service-role ile yazar.)
-- ============================================================

drop policy if exists "public create appointment" on public.appointments;

-- PostgREST şema/politika önbelleğini tazele (değişiklik hemen geçerli olsun).
notify pgrst, 'reload schema';
