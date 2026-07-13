# Planlar — İleride Yapılacaklar

> Bildirim altyapısı notları.
> Karar: Önce **Web Push** (bedava, hızlı), sonra **WhatsApp** (tam kapsama).
> Son güncelleme: 13 Temmuz 2026

---

## 1) Web Push Bildirimi — ✅ YAPILDI (Faz 8)

> **Kod tamamlandı** — e-postanın YANINA ikinci kanal olarak eklendi, e-posta
> akışına hiç dokunulmadı. Bildirim **hem müşteriye** (randevusu onaylanınca/
> iptal/zaman aşımı) **hem berbere** (yeni randevu gelince) gidiyor.
>
> **Canlıya almak için 3 adım (elle, bir kez):**
> 1. Supabase SQL Editor'de `supabase/migrations/0005_push_subscriptions.sql`'i çalıştır.
> 2. Vercel > Project > Settings > Environment Variables'a ekle (Production):
>    `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
>    (değerler `.env.local`'de hazır).
> 3. main'e push → otomatik deploy. Bitti.
>
> **Yerelde test:** `next dev --experimental-https` (push güvenli bağlam ister).
>
> Aşağıdaki notlar tasarım gerekçesi olarak duruyor.

Mobil uygulamalardaki push bildiriminin tarayıcı versiyonu. Müşteri siteyi bir
kez açıp "izin ver" derse, siteyi kapatsa bile telefonuna bildirim düşürebiliriz.
**Tamamen bedava** — mesaj başına ücret yok.

### Nasıl çalışıyor?
1. Müşteri randevu alır → site "Bildirim izni ister misin?" der
2. Müşteri "İzin Ver" der → tarayıcı ona özel bir "abonelik adresi" (subscription) üretir
3. Bu adresi Supabase'e kaydederiz
4. Berber randevuyu onaylar/iptal eder
5. Sunucumuz o adrese sinyal gönderir (Google FCM / Apple push servisi üzerinden)
6. Telefonda bildirim belirir — site kapalı olsa bile

### Dürüst sınır (ÖNEMLİ)
| Cihaz | Durum |
|---|---|
| Android + Chrome | ✅ Kusursuz, tarayıcı kapalıyken bile |
| Masaüstü (Chrome/Edge/Firefox) | ✅ Çalışır |
| iPhone (Safari) | ⚠️ SADECE müşteri siteyi "Ana Ekrana Ekle" yaparsa (iOS 16.4+). Normal sekmede push GELMEZ. |

> Özet: Web push = Android'de mükemmel, iPhone'da yarım. iPhone tam kapsama için WhatsApp lazım.

### Ne yapıldı (✅ hepsi bağlandı)
- Müşteriye "İzin Ver 🔔" adımı → takip sayfasında (`/randevu/durum`, pending kartı)
- Berbere "İzin Ver 🔔" adımı → admin panel dashboard (cihaza özel)
- İzin verenlerin bilgisi → `push_subscriptions` tablosu (RLS kilitli)
- Durum değişince tetik → onay/iptal/zaman aşımı (müşteri) + yeni randevu (berber)
- iPhone "Ana Ekrana Ekle" yönlendirmesi → PushOptin bileşeninde otomatik

### ✅ Karar verildi: HEM MÜŞTERİ HEM BERBER
Müşteri → randevusu onaylanınca/iptal/zaman aşımı. Berber → yeni randevu gelince.
Berber aboneliği giriş e-postasını `barbers.email` ile eşler; eşleşme yoksa
"sahip cihazı" sayılır ve TÜM yeni randevuları alır (e-posta fallback mantığı).

---

## 2) WhatsApp Bildirimi — SONRA BU

iPhone dahil herkeste, her telefonda kesin çalışır. Ama kurulumu zahmetli +
kuruşluk masrafı var.

### Maliyet (Temmuz 2026, 1 USD ≈ 47 TL)
İki katman ödeme var:

| Katman | Ne için | Mesaj başına |
|---|---|---|
| Meta (WhatsApp) | "Utility" şablon mesajı (randevu onayı/hatırlatma) | ~0,04–0,25 TL (TR utility: $0.0008–$0.0053) |
| Sağlayıcı (Twilio) | API aracısı, aylık abonelik yok | ~0,24 TL ($0.005/mesaj) |
| **Toplam** | | **≈ 0,30–0,50 TL / bildirim** |

Aylık senaryo (tek berber):
- ~300 randevu/ay → **~90–150 TL**
- ~900 randevu/ay → **~270–450 TL**
- Onay + hatırlatma (2 mesaj/randevu, yoğun) → **~540–900 TL** (aylık ~20$)

> Para tarafı çay parası. Asıl "maliyet" kurulum zahmeti.

### Kurulum gereksinimleri (para değil, uğraş)
- Meta Business hesabı + Facebook işletme doğrulaması (dükkân evrakı)
- Müşterinin normal WhatsApp'ta kullanmadığı AYRI/özel numara
- Twilio hesabı (düşük hacimde pay-as-you-go en mantıklısı)
- Mesaj şablonunu (template) önceden Meta'ya onaylatmak — serbest metin gönderilemez

### Dürüst not
"24 saat ücretsiz pencere" bize işlemez: müşteri siteden randevu alıyor,
WhatsApp'a yazmıyor → onay mesajı "işletme başlattı" sayılır = ücretli.
(Yine de kuruşluk, dert değil.)

---

## Karşılaştırma özeti

| | Web Push | WhatsApp |
|---|---|---|
| Maliyet | Bedava | ~0,30-0,50 TL/mesaj |
| Kurulum zahmeti | Düşük (birkaç saat kod) | Yüksek (Meta doğrulama + template) |
| iPhone | Yarım (ana ekrana eklerse) | Tam |
| Android | Tam | Tam |
| İzin | Bir kez "İzin Ver" | Numara + opt-in |

**Yol haritası:** Web push → çalışır hale getir → iPhone açığını görünce WhatsApp'ı üstüne koy. İkisi çakışmaz, tamamlar.
