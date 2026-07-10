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
- [x] 🧑‍💻 Galeri (fotoğraf ızgarası) — şimdilik stilize placeholder karolar
- [x] 🧑‍💻 Çalışma saatleri + konum (harita) + iletişim — DB'den saatler (bugün vurgulu) + Google Maps gömme
- [x] 🧑‍💻 Footer + sosyal medya
- [x] 🧑‍💻 Tam responsive (telefon/tablet/masaüstü)
- [ ] 🙋 Gerçek foto/logo/metin ver (yoksa geçici görsel kullanırım) — şu an placeholder kullanılıyor

**✅ Bitti sayılır:** Her ekranda şık görünen, gerçek içerikli anasayfa. → **TAMAM** (DB verisiyle canlı test edildi, build ✓)

---

## 📅 Faz 3 — Randevu Akışı (projenin kalbi)
**Amaç:** Uçtan uca çalışan, çakışmayı engelleyen online randevu.

- [ ] 🧑‍💻 Adım adım randevu sihirbazı:
  - Adım 1: Hizmet seç (süre + fiyat görünür)
  - Adım 2: Berber seç (veya "farketmez")
  - Adım 3: Tarih seç (takvim)
  - Adım 4: Uygun saati seç
  - Adım 5: Ad + telefon + e-posta + not
  - Adım 6: Özet + onay
- [ ] 🧑‍💻 **Boş slot hesaplama motoru** (çalışma saati − dolu randevu − izin)
- [ ] 🧑‍💻 Çakışma önleme (sunucuda transaction + DB kısıtı)
- [ ] 🧑‍💻 Randevu oluşturma (server action)
- [ ] 🧑‍💻 Başarı ekranı + randevu referans numarası
- [ ] 🧑‍💻 Form doğrulama (geçersiz telefon/tarih vs.)

**✅ Bitti sayılır:** Müşteri gerçek randevu oluşturuyor, dolu saat kapanıyor, çift randevu engelleniyor.

---

## 🔐 Faz 4 — Admin Panel
**Amaç:** Berberin randevuları ve ayarları yönettiği korumalı panel.

- [ ] 🧑‍💻 Berber girişi (Supabase Auth — e-posta ile)
- [ ] 🧑‍💻 `/admin` route'unu koruma (giriş yoksa engelle)
- [ ] 🧑‍💻 Dashboard: bugünün randevuları özeti
- [ ] 🧑‍💻 Randevu listesi + filtre (tarih / durum)
- [ ] 🧑‍💻 Takvim görünümü (günlük/haftalık)
- [ ] 🧑‍💻 Randevu işlemleri: onayla / iptal / tamamlandı
- [ ] 🧑‍💻 Hizmet yönetimi (ekle / düzenle / sil)
- [ ] 🧑‍💻 Çalışma saati yönetimi
- [ ] 🧑‍💻 İzin / kapalı gün ekleme
- [ ] 🙋 Admin e-posta adresini belirle

**✅ Bitti sayılır:** Berber giriş yapıp tüm randevu ve ayarları yönetebiliyor.

---

## 🔔 Faz 5 — Bildirimler
**Amaç:** Randevu alınca onay, öncesinde hatırlatma otomatik gitsin.

- [ ] 🙋 resend.com hesabı aç + API anahtarı ver
- [ ] 🧑‍💻 E-posta şablonları (onay / iptal / hatırlatma)
- [ ] 🧑‍💻 Randevu oluşunca onay e-postası (müşteriye + berbere)
- [ ] 🧑‍💻 Hatırlatma cron job'u (randevudan X saat önce otomatik)
- [ ] 🧑‍💻 _(Opsiyonel)_ SMS entegrasyonu
  - ⚠️ 🙋 Türkiye'de ticari SMS için İYS kaydı + paralı sağlayıcı (Netgsm vb.) gerekir

**✅ Bitti sayılır:** Randevu alınca mail düşüyor, randevudan önce hatırlatma gidiyor.

---

## ✨ Faz 6 — Cila & Yayın
**Amaç:** Hızlı, cilalı, gerçek kullanıcıya hazır canlı site.

- [ ] 🧑‍💻 SEO: sayfa başlıkları, Open Graph, sitemap, favicon
- [ ] 🧑‍💻 Yükleniyor / hata / boş durum ekranları
- [ ] 🧑‍💻 Erişilebilirlik (a11y) kontrolü
- [ ] 🧑‍💻 Performans (Lighthouse) iyileştirmesi
- [ ] 🧑‍💻 Vercel'e deploy + ortam değişkenleri
- [ ] 🧑‍💻 Supabase production ayarları
- [ ] 🙋 _(Opsiyonel)_ Alan adı (domain) al → bağla

**✅ Bitti sayılır:** Site canlıda, hızlı ve gerçek müşteriye hazır. 🚀

---

## 🔗 Bağımlılık sırası
`Faz 0 → Faz 1` zorunlu ilk ikili. Sonra `Faz 2` ve `Faz 3` paralel gidebilir ama
randevu akışı (Faz 3) için Faz 1 şart. `Faz 4`, Faz 1+3'e bağlı. `Faz 5`, Faz 3'e bağlı.
`Faz 6` en son. **Her fazı bitirince canlıda çalışan bir şey görüyorsun** — parça parça ilerliyoruz.
