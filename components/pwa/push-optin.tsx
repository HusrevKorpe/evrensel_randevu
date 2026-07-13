"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Loader2, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WEB PUSH İZİN BİLETİ — hem müşteri (takip sayfası) hem berber (panel)
 * kullanır; farkı sadece metinler + kaydet/sil eylemleridir.
 *
 * Ne yapar?
 *  1) Tarayıcı destekliyor mu bakar (yoksa hiç görünmez).
 *  2) Service worker'ı (/sw.js) kaydeder, mevcut aboneliği okur.
 *  3) "İzin Ver" → izin ister + abone olur + `onSubscribe` ile sunucuya kaydeder.
 *  4) iPhone'da tarayıcı sekmesinde push GELMEZ → "Ana Ekrana Ekle" yönlendirir.
 *
 * VAPID public anahtarı tanımlı değilse (push kapalı) hiçbir şey göstermez.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** VAPID public anahtarını tarayıcının beklediği byte dizisine çevirir.
 *  Dönüş, ArrayBuffer tabanlı Uint8Array (BufferSource) olmalı. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushOptinProps = {
  /** Abone değilken gösterilecek çağrı (ör. "Onaylanınca haber ver"). */
  title: string;
  /** Butonun altındaki kısa açıklama. */
  hint: string;
  /** Aboneyken gösterilecek onay metni. */
  activeText: string;
  /** Sunucuya kaydet — abonelik nesnesini alır. */
  onSubscribe: (sub: PushSubscriptionJSON) => Promise<{ ok: boolean; error?: string }>;
  /** Sunucudan sil — endpoint'i alır. */
  onUnsubscribe: (endpoint: string) => Promise<void>;
  className?: string;
};

type Status = "loading" | "idle" | "subscribed" | "denied" | "ios-install" | "hidden";

export function PushOptin({
  title,
  hint,
  activeText,
  onSubscribe,
  onUnsubscribe,
  className,
}: PushOptinProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<PushSubscription | null>(null);

  // Kurulum: destek kontrolü + SW kaydı + mevcut abonelik.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Anahtar yoksa push kapalı → hiç gösterme.
      if (!VAPID_PUBLIC_KEY) return setStatus("hidden");

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari'nin kendine özgü bayrağı:
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      // iPhone + normal sekme → push gelmez, "ana ekrana ekle" yönlendir.
      if (isIOS && !isStandalone) return setStatus("ios-install");

      const supported =
        "serviceWorker" in navigator && "PushManager" in window;
      if (!supported) return setStatus("hidden");

      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) {
          setSub(existing);
          setStatus("subscribed");
        } else if (Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus("idle");
        }
      } catch (err) {
        console.error("push init:", err);
        if (!cancelled) setStatus("hidden");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const json = newSub.toJSON() as PushSubscriptionJSON;
      const res = await onSubscribe(json);
      if (!res.ok) {
        // Sunucuya yazılamadıysa tarayıcı aboneliğini de geri al (tutarlılık).
        await newSub.unsubscribe().catch(() => {});
        setError(res.error ?? "Kaydedilemedi.");
        return;
      }
      setSub(newSub);
      setStatus("subscribed");
    } catch (err) {
      // Kullanıcı izni reddederse subscribe() throw eder.
      if (Notification.permission === "denied") setStatus("denied");
      else setError("Bildirim açılamadı, tekrar dene.");
      console.error("push subscribe:", err);
    } finally {
      setBusy(false);
    }
  }, [onSubscribe]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const endpoint = sub?.endpoint;
      await sub?.unsubscribe().catch(() => {});
      if (endpoint) await onUnsubscribe(endpoint);
      setSub(null);
      setStatus("idle");
    } finally {
      setBusy(false);
    }
  }, [sub, onUnsubscribe]);

  if (status === "hidden" || status === "loading") return null;

  // iPhone: normal sekmede push gelmez → kurulum yönergesi.
  if (status === "ios-install") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Bell className="size-4 text-brand" />
          Telefonuna bildirim ister misin?
        </p>
        <p className="mt-1.5 leading-relaxed">
          iPhone&apos;da bildirim için önce paylaş{" "}
          <Share className="inline size-3.5 align-text-bottom" /> menüsünden
          <span className="font-medium text-foreground"> “Ana Ekrana Ekle”</span>
          &apos;yi seç, sonra uygulamayı ana ekrandan aç.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        Bildirim izni tarayıcıda engellenmiş. Açmak için site ayarlarından
        bildirimlere izin verebilirsin.
      </div>
    );
  }

  if (status === "subscribed") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <BellRing className="size-4 text-emerald-600 dark:text-emerald-400" />
          {activeText}
        </p>
        <button
          type="button"
          onClick={unsubscribe}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          aria-label="Bildirimi kapat"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          Kapat
        </button>
      </div>
    );
  }

  // idle → izin iste
  return (
    <div className={cn("rounded-xl border border-brand/30 bg-brand/5 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Bell className="size-4 text-brand" />
            {title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <button
          type="button"
          onClick={subscribe}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
          İzin Ver
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
