/*
 * SERVICE WORKER — Web Push bildirimlerini alıp gösterir.
 *
 * Bu dosya tarayıcıda, sayfadan BAĞIMSIZ çalışır (site sekmesi kapalı olsa
 * bile). Sunucu `web-push` ile bir sinyal gönderdiğinde 'push' olayı burada
 * tetiklenir ve telefonda/masaüstünde bildirimi biz gösteririz.
 *
 * Yükü (payload) sunucu JSON olarak yollar: { title, body, url, tag }.
 * `url` → bildirime tıklanınca açılacak sayfa (müşteri takip linki ya da
 * berber paneli). `tag` → aynı randevunun bildirimleri üst üste yığılmasın.
 *
 * ⚠️ next.config.ts bu dosyaya "no-store" verir → tarayıcı hep en güncel
 * sürümü çeker (eski service worker'a takılı kalmayız).
 */

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    // Beklenmedik/boş yük — yine de sessiz kalmayalım.
    data = { title: "Evrensel Kuaför", body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    tag: data.tag, // aynı tag → bildirim güncellenir, yenisi yığılmaz
    renotify: Boolean(data.tag),
    // Tıklanınca açılacak adresi bildirimin içine iliştir.
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Evrensel Kuaför", options),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  // Zaten açık bir sekme varsa onu öne getir; yoksa yenisini aç.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
