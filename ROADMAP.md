# 💈 Berber Randevu Sitesi — Yol Haritası

> **Kapsam:** Tek dükkan · **Stack:** Next.js + Supabase · **Tasarım:** Modern & minimal
> **Özellikler:** Online randevu + takvim · Admin panel · E-posta hatırlatma (SMS opsiyonel)

**Lejant:** 🧑‍💻 = Ben (Claude) yaparım · 🙋 = Senin yapman gereken · `[ ]` = yapılacak · `[x]` = bitti

---

## 🧱 Faz 0 — Kurulum & İskelet
**Amaç:** `npm run dev` deyince açılan, stilize edilmiş boş bir Next.js projesi.

- [x] 🧑‍💻 Next.js 16 projesi oluştur (TypeScript + App Router + Tailwind v4 + ESLint)
- [x] 🧑‍💻 Klasör yapısını kur (`app/`, `components/`, `lib/`, `types/`)
- [x] 🧑‍💻 shadcn/ui kur ve başlat (base-nova) — `Button` + `lib/utils` geldi
- [x] 🧑‍💻 Tema: imza altın vurgu (`--brand`) + Space Grotesk başlık fontu + `next-themes` koyu tema + tema düğmesi
- [x] 🧑‍💻 `.env.example` + ortam değişkeni yapısı (Supabase/Resend için hazır)
- [x] 🧑‍💻 Git repo (create-next-app başlattı) + `.gitignore` düzeni + Faz 0 commit
- [ ] 🙋 GitHub'da boş repo aç (opsiyonel, sonra da olur)

**✅ Bitti sayılır:** Tarayıcıda stilize, koyu temalı başlangıç sayfası açılıyor. → **TAMAM** (localhost:3000)

---

## 🗄️ Faz 1 — Veritabanı & Altyapı
**Amaç:** Güvenli, örnek verisi dolu, koddan okunabilen bir veritabanı.

- [x] 🙋 supabase.com'da proje aç, API anahtarları verildi (`.env.local`'a kondu)
- [x] 🧑‍💻 Şema SQL: `services`, `barbers`, `working_hours`, `time_off`, `appointments`
- [x] 🧑‍💻 İlişkiler + indexler + **çakışma engelleme kısıtı** (exclusion constraint — aynı saate 2 randevu imkânsız)
- [x] 🧑‍💻 RLS politikaları (herkes okur; ziyaretçi randevu oluşturur ama okuyamaz; admin yönetir) — canlı test edildi ✅
- [x] 🧑‍💻 Örnek veri (6 hizmet + 2 berber + 12 çalışma saati satırı)
- [x] 🧑‍💻 Supabase istemcileri (client / server / admin)
- [x] 🧑‍💻 TypeScript tipleri (`types/index.ts` — şemayla birebir; ileride CLI ile otomatik üretime geçebiliriz)

**✅ Bitti sayılır:** Tablolar + örnek veri hazır, kod DB'ye güvenli bağlanıyor. → **TAMAM** (canlı sorgu ile kanıtlandı)

---

## 🏠 Faz 2 — Vitrin (Anasayfa)
**Amaç:** Mobil ve masaüstünde şık duran, gerçek verili landing page.

- [x] 🧑‍💻 Tasarım sistemi: renk/tipografi/boşluk kuralları (`components/site/section.tsx` + `--brand` token'ları)
- [x] 🧑‍💻 Header + gezinme menüsü (mobil hamburger menü dahil) — sticky, scroll'da belirginleşir
- [x] 🧑‍💻 Hero bölümü — büyük başlık + "Randevu Al" butonu + güven istatistikleri
- [x] 🧑‍💻 Hizmetler bölümü (DB'den çekilen, fiyatlı) — `services` tablosu, fiyat + süre
- [x] 🧑‍💻 Hakkında / "Neden biz" bölümü — 4 değer kartı
- [x] 🧑‍💻 Galeri (fotoğraf ızgarası) — gerçek fotoğraflar (Unsplash stok, ücretsiz) + hero arka planı
- [x] 🧑‍💻 Çalışma saatleri + konum (harita) + iletişim — DB'den saatler (bugün vurgulu) + Google Maps gömme
- [x] 🧑‍💻 Footer + sosyal medya
- [x] 🧑‍💻 Tam responsive (telefon/tablet/masaüstü)
- [ ] 🙋 Gerçek foto/logo/metin ver (yoksa geçici görsel kullanırım) — şu an placeholder kullanılıyor

**✅ Bitti sayılır:** Her ekranda şık görünen, gerçek içerikli anasayfa. → **TAMAM** (DB verisiyle canlı test edildi, build ✓)

---

## 📅 Faz 3 — Randevu Akışı (projenin kalbi)
**Amaç:** Uçtan uca çalışan, çakışmayı engelleyen online randevu.

- [x] 🧑‍💻 Adım adım randevu sihirbazı:
  - Adım 1: Hizmet seç (süre + fiyat görünür)
  - Adım 2: Berber seç (veya "farketmez")
  - Adım 3: Tarih seç (takvim)
  - Adım 4: Uygun saati seç
  - Adım 5: Ad + telefon + e-posta + not
  - Adım 6: Özet + onay
- [x] 🧑‍💻 **Boş slot hesaplama motoru** (çalışma saati − dolu randevu − izin − mola − geçmiş) — canlı test edildi ✅
- [x] 🧑‍💻 Çakışma önleme (DB exclusion kısıtı `23P01`; sunucuda yeniden doğrulama) — canlı test edildi ✅
- [x] 🧑‍💻 Randevu oluşturma (server action, admin istemci)
- [x] 🧑‍💻 Başarı ekranı + randevu referans numarası (UUID ilk 8 hane)
- [x] 🧑‍💻 Form doğrulama (TR telefon normalleştirme + e-posta; istemci & sunucu)

**✅ Bitti sayılır:** Müşteri gerçek randevu oluşturuyor, dolu saat kapanıyor, çift randevu engelleniyor. → **TAMAM** (slot motoru + çakışma DB'ye karşı doğrulandı, build ✓)

---

## 🔐 Faz 4 — Admin Panel
**Amaç:** Berberin randevuları ve ayarları yönettiği korumalı panel.

- [x] 🧑‍💻 Berber girişi (Supabase Auth — e-posta ile) — **Parça A**
- [x] 🧑‍💻 `/admin` route'unu koruma (giriş yoksa engelle) — **Parça A** (proxy + layout + DAL, 3 kat)
- [x] 🧑‍💻 Dashboard: bugünün randevuları özeti — **Parça A**
- [x] 🧑‍💻 Randevu listesi + filtre (tarih / durum) — **Parça B**
- [x] 🧑‍💻 Takvim görünümü (günlük/haftalık) — `/admin/takvim`: haftalık ızgara + berber-sütunlu gün görünümü, durum renkleri, "şu an" çizgisi
- [x] 🧑‍💻 Randevu işlemleri: onayla / iptal / tamamlandı (+ gelmedi / geri al) — **Parça B**
- [x] 🧑‍💻 Hizmet yönetimi (ekle / düzenle / sil + aktif-pasif + sıralama) — **Parça C**
- [x] 🧑‍💻 Çalışma saati yönetimi (gün aç/kapa + saat + mola, berber bazlı) — **Parça C**
- [x] 🧑‍💻 İzin / kapalı gün ekleme (berber veya tüm dükkan; çakışan randevu uyarısı) — **Parça C**
- [x] 🙋 Admin e-posta adresini belirle — admin kullanıcı oluşturuldu (husrevkorpe@gmail.com, onaylı)

**✅ Bitti sayılır:** Berber giriş yapıp tüm randevu ve ayarları yönetebiliyor. → **TAMAM** 🎉

---

## 🔔 Faz 5 — Bildirimler
**Amaç:** Randevu alınca onay, öncesinde hatırlatma otomatik gitsin.

- [x] 🙋 resend.com hesabı aç + API anahtarını `.env.local`'a koy (`RESEND_API_KEY`) — kondu, gerçek gönderimle test edildi ✓
- [x] 🙋 `supabase/migrations/0002_reminders.sql` dosyasını Supabase SQL Editor'da çalıştır — çalıştırıldı, kolon doğrulandı ✓
- [ ] 🙋 _(Yayın öncesi)_ resend.com/domains'ten kendi alan adını doğrula + `RESEND_FROM_EMAIL`'i doldur
  - ⚠️ Doğrulanana kadar Resend test modunda: e-postalar SADECE hesap sahibinin adresine (husrevkorpe@gmail.com) gidebilir, müşterilere gitmez
- [x] 🧑‍💻 E-posta şablonları (onay / iptal / hatırlatma + berbere yeni-randevu) — `lib/notifications/templates.ts`
- [x] 🧑‍💻 Bildirim katmanı soyutlaması — `lib/notifications/` (Resend'e düz HTTP; ileride WhatsApp/SMS kanalı eklenebilir)
- [x] 🧑‍💻 Randevu oluşunca onay e-postası (müşteriye + berbere) + admin onay/iptalinde müşteriye bilgi — `after()` ile, yanıtı bekletmez
- [x] 🧑‍💻 Hatırlatma cron job'u — `GET /api/cron/reminders` (CRON_SECRET korumalı) + `vercel.json` (her gün 09:00 İstanbul; randevudan `REMINDER_HOURS_BEFORE=24` saat önce)
- [ ] 🧑‍💻 _(Opsiyonel)_ SMS entegrasyonu
  - ⚠️ 🙋 Türkiye'de ticari SMS için İYS kaydı + paralı sağlayıcı (Netgsm vb.) gerekir

**✅ Bitti sayılır:** Randevu alınca mail düşüyor, randevudan önce hatırlatma gidiyor. → **TAMAM** 🎉 (canlı gönderim + çift-gönderim engeli + 401 koruması test edildi; SMS bilinçli olarak ertelendi)
**Deploy notu (Faz 6):** Vercel ortam değişkenlerine `RESEND_API_KEY`, `ADMIN_EMAIL`, `CRON_SECRET`, `REMINDER_HOURS_BEFORE` eklenecek; alan adı alınınca Resend'te doğrulanıp `RESEND_FROM_EMAIL` doldurulacak.

---

## ✨ Faz 6 — Cila & Yayın
**Amaç:** Hızlı, cilalı, gerçek kullanıcıya hazır canlı site.

- [x] 🧑‍💻 SEO: sayfa başlıkları, Open Graph görseli, sitemap, robots.txt, favicon/ikonlar, manifest, canonical, JSON-LD (BarberShop şeması)
- [x] 🧑‍💻 Yükleniyor / hata / boş durum ekranları — `loading` (site+panel), `error`, `global-error`, `not-found`; boş durumlar Faz 2-4'te zaten vardı
- [x] 🧑‍💻 Erişilebilirlik (a11y) kontrolü — label/aria-invalid/aria-live/alt'lar yerinde; yükleme ekranlarına `role="status"` eklendi
- [x] 🧑‍💻 Performans — anasayfa artık STATİK + 5 dk ISR (çerezsiz `lib/supabase/public.ts` istemcisi); hero `priority`; kullanılmayan boilerplate silindi
- [ ] 🧑‍💻 Vercel'e deploy + ortam değişkenleri — 🙋 önce `npx vercel login` gerekiyor (interaktif)
- [ ] 🙋 **Supabase production ayarları — KRİTİK:** Dashboard → Authentication → Sign In / Providers → **"Allow new users to sign up" KAPAT** (açık kalırsa herkes kayıt olup admin yetkisi alır çünkü RLS "giriş yapmış = admin" sayıyor!)
- [ ] 🙋 _(Opsiyonel)_ Alan adı (domain) al → bağla → Resend'te domain doğrula + `RESEND_FROM_EMAIL` doldur

**✅ Bitti sayılır:** Site canlıda, hızlı ve gerçek müşteriye hazır. 🚀

---

## 🔗 Bağımlılık sırası
`Faz 0 → Faz 1` zorunlu ilk ikili. Sonra `Faz 2` ve `Faz 3` paralel gidebilir ama
randevu akışı (Faz 3) için Faz 1 şart. `Faz 4`, Faz 1+3'e bağlı. `Faz 5`, Faz 3'e bağlı.
`Faz 6` en son. **Her fazı bitirince canlıda çalışan bir şey görüyorsun** — parça parça ilerliyoruz.
