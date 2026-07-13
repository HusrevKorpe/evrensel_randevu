"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BellRing, Loader2, Share, X } from "lucide-react";
import { detectPushEnv, ensureBrowserSubscription } from "@/components/pwa/push-shared";
import { cn } from "@/lib/utils";

/**
 * SİTE GENELİ BİLDİRİM ŞERİDİ — müşteri siteye girince alttan yumuşakça
 * kayarak çıkar: "Randevu haberlerini kaçırma, bildirimleri aç."
 *
 * NEDEN BURADA İZİN İSTİYORUZ?
 *  Push izni bir kez reddedilirse (ya da sekme kapanırsa) bir daha sorulamaz.
 *  Bu yüzden izni müşteri siteyle ilgiliyken, YUMUŞAK bir davetle alırız.
 *
 * ÖNEMLİ — bu şerit SUNUCUYA HİÇBİR ŞEY YAZMAZ:
 *  Sadece tarayıcı iznini alır + tarayıcı push aboneliğini kurar. Ortada
 *  henüz randevu olmadığı için "kime, hangi randevu için haber verilecek"
 *  bilgisi yoktur. Müşteri randevu alıp TAKİP SAYFASINA düştüğünde, oradaki
 *  kart (PushOptin, rebindOnLoad) bu hazır aboneliği token'la o randevuya
 *  bağlar → onay/iptal bildirimi gerçekten düşer. Böylece anonim/yetkisiz
 *  bir sunucu yazması eklemeden zincir tamamlanır.
 *
 * GÖRÜNMEME KOŞULLARI:
 *  - VAPID yok / tarayıcı desteklemiyor → hiç çıkmaz.
 *  - Zaten abone → çıkmaz.
 *  - İzin daha önce reddedilmiş → çıkmaz (nafile ısrar etmeyiz).
 *  - Yakın zamanda "Şimdi değil" denmiş → soğuma süresi dolana dek çıkmaz.
 *  - Berber paneli (/admin) ve randevu onay/durum sayfaları → çıkmaz
 *    (onların kendi, bağlama özel istemleri var).
 */

/** "Şimdi değil" dedikten sonra kaç gün boyunca tekrar sormayalım. */
const SNOOZE_MS = 5 * 24 * 60 * 60 * 1000; // 5 gün
/** Sayfa açılır açılmaz zıplamasın — küçük bir nefes payı. */
const REVEAL_DELAY_MS = 2500;
/** İzin verilince "açıldı" mesajını gösterme süresi. */
const GRANTED_FLASH_MS = 3500;
const SNOOZE_KEY = "nb-snooze-until";

/** Bu şeridin çıkmayacağı yollar (kendi push istemi olanlar / berber tarafı). */
function isSuppressedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/randevu/durum" ||
    pathname === "/randevu/onay"
  );
}

type Candidate = "primer" | "ios" | null;

export function NotifyBanner() {
  const pathname = usePathname();
  const suppressed = isSuppressedRoute(pathname);

  // Ne gösterelim? primer = izin daveti, ios = "ana ekrana ekle" yönergesi.
  const [candidate, setCandidate] = useState<Candidate>(null);
  const [entered, setEntered] = useState(false); // kayma animasyonu
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false); // "açıldı" kutlaması

  // 1) Uygunluk kararı — yalnızca mount'ta. Ortam + abonelik + soğuma.
  //    Karar TEK async fonksiyonda verilir; setState yalnızca sonuç
  //    callback'inde çağrılır (effect gövdesinde senkron setState yok).
  useEffect(() => {
    let cancelled = false;

    async function decide(): Promise<Candidate> {
      const env = detectPushEnv();
      if (env === "unsupported") return null;

      // "Şimdi değil" soğuması dolmadıysa hiç gösterme.
      try {
        const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
        if (until && Date.now() < until) return null;
      } catch {
        /* localStorage kapalı olabilir (gizli mod) — sorun değil, devam. */
      }

      if (env === "ios-install") return "ios";

      // "ready": zaten abone miyiz / izin reddedilmiş mi? SW'yi kaydedip bak.
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await reg.pushManager.getSubscription();
        const denied =
          "Notification" in window && Notification.permission === "denied";
        if (!sub && !denied) return "primer";
      } catch {
        /* SW kaydı olmadıysa sessizce vazgeç. */
      }
      return null;
    }

    void decide().then((c) => {
      if (!cancelled && c) setCandidate(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Uygunsa ve gizlenmeyen bir yoldaysak → gecikmeli kayma animasyonu.
  //    (entered zaten false başlar; sıfırlamayı kapatma/route değişimi yönetir.)
  useEffect(() => {
    if (!candidate || suppressed) return;
    const t = setTimeout(() => setEntered(true), REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [candidate, suppressed]);

  /** Şeridi kapat; `snooze` ise soğuma süresi başlat (bir süre tekrar sorma). */
  const close = useCallback((snooze: boolean) => {
    setEntered(false);
    if (snooze) {
      try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
      } catch {
        /* yoksay */
      }
    }
    // Kayma animasyonu bitince DOM'dan da kaldır.
    setTimeout(() => setCandidate(null), 300);
  }, []);

  /** "Bildirimleri Aç": izin iste + tarayıcı aboneliğini kur (sunucuya yazma). */
  const enable = useCallback(async () => {
    setBusy(true);
    try {
      await ensureBrowserSubscription();
      // Başarılı → kısa kutlama, sonra kapan (ve bir daha sorma).
      setGranted(true);
      setTimeout(() => close(true), GRANTED_FLASH_MS);
    } catch (err) {
      // Reddedildiyse ısrar etme; soğumaya al, sessizce kapan.
      if ("Notification" in window && Notification.permission === "denied") {
        close(true);
      }
      console.error("notify-banner enable:", err);
    } finally {
      setBusy(false);
    }
  }, [close]);

  if (!candidate || suppressed) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4",
        "transition-all duration-300 ease-out",
        entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
      )}
      // Ekran okuyucuya duyur ama odağı çalmadan.
      role="dialog"
      aria-live="polite"
      aria-label="Bildirim izni"
    >
      <div className="w-full max-w-md rounded-2xl border border-brand/30 bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
        {granted ? (
          // ── İzin verildi: kısa kutlama ──
          <p className="flex items-center gap-2.5 text-sm font-medium">
            <BellRing className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Bildirimler açıldı! Randevu haberlerini artık kaçırmayacaksın 🔔
          </p>
        ) : candidate === "ios" ? (
          // ── iPhone normal sekme: önce ana ekrana ekle ──
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Telefonuna bildirim ister misin?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                iPhone&apos;da bildirim için önce paylaş{" "}
                <Share className="inline size-3.5 align-text-bottom" /> menüsünden{" "}
                <span className="font-medium text-foreground">“Ana Ekrana Ekle”</span>
                &apos;yi seç, sonra uygulamayı ana ekrandan aç.
              </p>
              <button
                type="button"
                onClick={() => close(true)}
                className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Anladım
              </button>
            </div>
            <DismissButton onClick={() => close(true)} />
          </div>
        ) : (
          // ── İzin daveti (primer) ──
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <BellRing className="size-5 text-brand" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Randevu haberlerini kaçırma 💈</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ustan randevunu onayladığında ya da bir değişiklik olduğunda
                telefonuna anında haber verelim — sayfayı açık tutmana gerek kalmaz.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={enable}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BellRing className="size-4" />
                  )}
                  Bildirimleri Aç
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  disabled={busy}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Şimdi değil
                </button>
              </div>
            </div>
            <DismissButton onClick={() => close(true)} />
          </div>
        )}
      </div>
    </div>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Kapat"
      className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
    >
      <X className="size-4" />
    </button>
  );
}
