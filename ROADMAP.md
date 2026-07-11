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
**⚠️ Güncelleme (2026-07-10):** Müşteri mailleri (talep alındı / onaylandı / hatırlatma) **Faz 7 kararıyla kaldırılacak** — sadece iptal maili kalacak, cron berbere dürtme atacak. Detay: Faz 7.
**Deploy notu (Faz 6):** Vercel ortam değişkenlerine `RESEND_API_KEY`, `ADMIN_EMAIL`, `CRON_SECRET` eklenecek (`REMINDER_HOURS_BEFORE` Faz 7'de kalktı; `APPROVAL_LINK_SECRET` isteğe bağlı); alan adı alınınca Resend'te doğrulanıp `RESEND_FROM_EMAIL` doldurulacak.

---

## ✨ Faz 6 — Cila & Yayın
**Amaç:** Hızlı, cilalı, gerçek kullanıcıya hazır canlı site.

- [x] 🧑‍💻 SEO: sayfa başlıkları, Open Graph görseli, sitemap, robots.txt, favicon/ikonlar, manifest, canonical, JSON-LD (BarberShop şeması)
- [x] 🧑‍💻 Yükleniyor / hata / boş durum ekranları — `loading` (site+panel), `error`, `global-error`, `not-found`; boş durumlar Faz 2-4'te zaten vardı
- [x] 🧑‍💻 Erişilebilirlik (a11y) kontrolü — label/aria-invalid/aria-live/alt'lar yerinde; yükleme ekranlarına `role="status"` eklendi
- [x] 🧑‍💻 Performans — anasayfa artık STATİK + 5 dk ISR (çerezsiz `lib/supabase/public.ts` istemcisi); hero `priority`; kullanılmayan boilerplate silindi
- [x] 🧑‍💻 Vercel'e deploy + ortam değişkenleri — CANLI: **https://berberweb.vercel.app** (2026-07-11, d1091af). `NEXT_PUBLIC_SITE_URL` düzeltildi (alt çizgili yanlış değer → `https://berberweb.vercel.app`), kalkan `REMINDER_HOURS_BEFORE` env'den silindi. Doğrulandı: anasayfa/admin/onay sayfası 200, robots+sitemap doğru URL, cron secretsiz 401, cron kaydı aktif (09:00 TR), loglar temiz ✓
- [x] 🙋 **Supabase production ayarları — KRİTİK:** signup KAPALI (auth ayarı API'den doğrulandı: `disable_signup: true` ✓)
- [ ] 🙋 _(Opsiyonel)_ Alan adı (domain) al → bağla → Resend'te domain doğrula + `RESEND_FROM_EMAIL` doldur → `NEXT_PUBLIC_SITE_URL`'i yeni domain yap
  - ⚠️ Domain doğrulanana dek Resend test modunda: mailler sadece husrevkorpe@gmail.com'a gider (şu an tek berber adresi de bu olduğu için akış çalışıyor)

**✅ Bitti sayılır:** Site canlıda, hızlı ve gerçek müşteriye hazır. 🚀 → **TAMAM** 🎉 (domain isteğe bağlı, sonraya)

---

## 📣 Faz 7 — Berber Bazlı Bildirim & Onay _(TAMAM 🎉 — Parça C bilinçli sonraya bırakıldı)_
**Amaç:** Yeni randevu bildirimi **atanan berbere** gitsin; berber mailden tek tıkla onaylasın/reddetsin.
Müşteriye artık yalnızca **red/iptal** durumunda mail gider — diğer tüm müşteri mailleri kalkar.

> **Karar (2026-07-10):** Müşteriye giden "talep alındı", "onaylandı" ve hatırlatma mailleri kaldırılacak
> (Faz 5'in müşteri tarafını geçersiz kılar). Tek istisna: berber reddederse müşteriye otomatik iptal
> maili (boşuna dükkana gelmesin diye). Formdaki e-posta alanı opsiyonel kalır, etiketi
> "İptal durumunda haber verebilmemiz için (isteğe bağlı)" olur.

- [x] 🧑‍💻 **Temizlik:** Müşteriye giden "talep alındı" + "onaylandı" + hatırlatma şablonları ve gönderim kodu kaldırıldı; form e-posta etiketi "iptal durumunda haber verebilmemiz için (isteğe bağlı)" oldu
- [x] 🧑‍💻 **Parça A — Mail doğru berbere:** Migration 0003 (`barbers.email`, anon'a KAPALI kolon); `notifyCreated` atanan berberin adresine gönderir (+ `ADMIN_EMAIL`'e kopya, berber e-postasızsa sadece sahibine); panelde `/admin/ayarlar/berberler` düzenleme sayfası
- [x] 🙋 **`supabase/migrations/0003_barber_email.sql`'i Supabase SQL Editor'da çalıştır** — çalıştırıldı; anon'un email/`*` okuyamadığı, servis rolünün okuduğu, eski kolonun düştüğü canlı doğrulandı ✓
- [ ] 🙋 5 berberin e-posta adreslerini topla, panele gir (`/admin/ayarlar/berberler`) — test için Ahmet Usta'ya husrevkorpe@gmail.com tanımlandı, gerisi berberler belli olunca
- [x] 🧑‍💻 **Parça B — Mailden tek tıkla onay:** İmzalı token'lı (HMAC-SHA256, randevu saatine kadar geçerli) "✅ Onayla / ❌ Reddet" linkleri → `/randevu/onay` sayfası
  - ✓ Link GET'te DİREKT onaylamaz — önce özet sayfası + buton (mail sunucuları linkleri otomatik açar; direkt onaylasak randevular kendi kendine onaylanırdı)
  - ✓ Red → müşteriye otomatik iptal maili (e-postası varsa); panel onayında artık müşteriye mail YOK
  - ✓ Aynı anda iki yanıt yarışı DB'de `status='pending'` şartıyla engellendi; noindex + robots disallow
- [x] 🧑‍💻 **Cron görev değişimi:** Müşteri hatırlatması silindi; `/api/cron/reminders` artık `pending` bekleyen GELECEK randevuları berber bazında gruplayıp her berbere onay linkli özet/dürtme atar (URL aynı kaldı, vercel.json değişmedi; `REMINDER_HOURS_BEFORE` kalktı)
- [ ] 🧑‍💻 **Parça C — Berber hesapları (sonraya):** `barbers.user_id` ↔ Supabase Auth eşleşmesi, roller (sahip her şeyi görür / berber sadece kendini), panelde "Randevularım" görünümü + bekleyen rozeti, RLS sıkılaştırma ("berber sadece kendi randevusunu günceller" DB seviyesinde)
- [x] 🙋 _(Migration sonrası)_ Gerçek uçtan uca test — canlı DB'de doğrulandı (2026-07-11): cron dürtmesi gerçek gönderildi (sent:2), yeni-randevu maili gitti, onay sayfası gerçek randevuyu gösterdi, mailden onay → confirmed / red → cancelled + müşteriye iptal maili, çift yanıt engellendi, yanlış cron secret → 401 ✓
- ⚠️ 🙋 **Ön koşul:** Resend'te domain doğrulanmadan mailler sadece hesap sahibinin adresine gider (test modu) — yani Faz 7'nin ÇOK berberli gerçek testi yayın (Faz 6) sonrası

**✅ Bitti sayılır:** Randevu gelince doğru berbere mail düşüyor, berber mailden tek tıkla onaylıyor/reddediyor, redde müşteri otomatik haber alıyor.

---

## 🔗 Bağımlılık sırası
`Faz 0 → Faz 1` zorunlu ilk ikili. Sonra `Faz 2` ve `Faz 3` paralel gidebilir ama
randevu akışı (Faz 3) için Faz 1 şart. `Faz 4`, Faz 1+3'e bağlı. `Faz 5`, Faz 3'e bağlı.
`Faz 6` yayın için son adım. `Faz 7` kod olarak bağımsız yazılabilir ama gerçek testi yayın sonrası
(Resend domain doğrulaması şart). **Her fazı bitirince canlıda çalışan bir şey görüyorsun** — parça parça ilerliyoruz.
