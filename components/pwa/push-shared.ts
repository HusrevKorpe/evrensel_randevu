/**
 * WEB PUSH — istemci tarafı ortak yardımcılar (tek kaynak).
 *
 * Hem SİTE GENELİ şerit (notify-banner) hem de BAĞLAMA ÖZEL izin bileti
 * (push-optin) buradan beslenir → aynı anahtar, aynı ortam kararları, aynı
 * abonelik davranışı. Böylece iki yerde birbirinden kaçan mantık olmaz.
 *
 * VAPID public anahtarı tanımlı değilse push tamamen KAPALIDIR: hiçbir UI
 * görünmez, hiçbir abonelik denenmez.
 */

/** VAPID public anahtarı — tanımsızsa push kapalı (build-time'da gömülür). */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** VAPID public anahtarını tarayıcının beklediği byte dizisine çevirir.
 *  Dönüş, ArrayBuffer tabanlı Uint8Array (BufferSource) olmalı. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Ortam sınıfı: push burada mümkün mü, değilse neden? */
export type PushEnv =
  | "unsupported" // tarayıcı desteklemiyor ya da VAPID anahtarı yok → hiç gösterme
  | "ios-install" // iPhone + normal sekme → push gelmez, önce "ana ekrana ekle"
  | "ready"; // abone olunabilir

/** Tarayıcı/cihaz ortamını sınıflandırır (destek + iOS/standalone). */
export function detectPushEnv(): PushEnv {
  if (!VAPID_PUBLIC_KEY) return "unsupported";

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari'nin kendine özgü bayrağı:
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  // iPhone normal sekmede push GELMEZ → ana ekrana eklemesi gerekir.
  if (isIOS && !isStandalone) return "ios-install";

  const supported = "serviceWorker" in navigator && "PushManager" in window;
  return supported ? "ready" : "unsupported";
}

/**
 * Service worker'ı kaydeder ve TARAYICI push aboneliğini döndürür.
 * Zaten abonelik varsa onu verir; yoksa izin ister + yenisini kurar.
 * İzin reddedilirse pushManager.subscribe() throw eder → çağıran taraf
 * Notification.permission'a bakarak "denied" ayrımını yapar.
 *
 * NOT: Burada SUNUCUYA HİÇBİR ŞEY yazılmaz. Kayıt/bağlama, çağıran tarafın
 * işidir (müşteri: randevu token'ıyla; berber: admin oturumuyla).
 */
export async function ensureBrowserSubscription(): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
  });
}
