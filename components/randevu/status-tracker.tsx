"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  Hourglass,
  Loader2,
  Phone,
  X,
} from "lucide-react";
import {
  cancelOwnAppointment,
  checkAppointmentStatus,
  removePushSubscription,
  savePushSubscription,
} from "@/app/randevu/durum/actions";
import { PushOptin } from "@/components/pwa/push-optin";
import { Button } from "@/components/ui/button";
import { formatClock, formatDateLong, telHref } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { CustomerStatusView } from "@/types";

/** `pending` iken kaç ms'de bir tazelensin ("canlı" his). */
const POLL_MS = 15_000;

/**
 * MÜŞTERİ CANLI TAKİP KARTI.
 *
 * Sunucu ilk durumu (`initial`) render eder; bu bileşen hidrasyon sonrası
 * `pending` olduğu sürece server action'ı POLL_MS'de bir çağırıp durumu
 * canlı günceller. Sekmeye geri dönünce de anında tazeler. Durum kesinleşince
 * (onay/iptal/tamamlandı) yoklamayı durdurur.
 */
export function StatusTracker({
  token,
  initial,
}: {
  token: string;
  initial: CustomerStatusView;
}) {
  const [view, setView] = useState<CustomerStatusView>(initial);
  // Müşteri iptal düğmesiyle kendi iptal ettiyse: "iptal edildi" yerine
  // ona özel (suçlamasız) bir teşekkür/onay mesajı göstermek için işaret.
  const [selfCancelled, setSelfCancelled] = useState(false);

  const refresh = useCallback(async () => {
    const res = await checkAppointmentStatus(token);
    if (res.ok) setView(res.view);
  }, [token]);

  useEffect(() => {
    // Yalnız `pending` iken yokla. Durum kesinleşince view.status değişir →
    // bu effect yeniden çalışır, aşağıdaki temizlik interval'i kaldırır ve
    // erken return ile yenisini kurmaz. Ekstra guard/ref gerekmez.
    if (view.status !== "pending") return;

    const id = setInterval(() => void refresh(), POLL_MS);
    // Sekmeye geri dönünce anında tazele (bekletme).
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, view.status]);

  return (
    <StatusCard
      view={view}
      token={token}
      selfCancelled={selfCancelled}
      onCancelled={(v) => {
        setSelfCancelled(true);
        setView(v);
      }}
    />
  );
}

// ── Duruma göre kart ────────────────────────────────────────────────────

function StatusCard({
  view,
  token,
  selfCancelled,
  onCancelled,
}: {
  view: CustomerStatusView;
  token: string;
  selfCancelled: boolean;
  onCancelled: (view: CustomerStatusView) => void;
}) {
  const summary = (
    <AppointmentSummary
      serviceName={view.serviceName}
      barberName={view.barberName}
      startsAtISO={view.startsAtISO}
      reference={view.reference}
    />
  );

  // 1) Bekliyor — canlı, nabız gibi.
  if (view.status === "pending") {
    return (
      <Shell
        tone="pending"
        icon={<Hourglass className="size-7 text-amber-600 dark:text-amber-400" />}
        title="Onay bekleniyor"
        text={
          view.deadlineISO
            ? `Ustan en geç ${formatDateLong(view.deadlineISO)} · ${formatClock(
                view.deadlineISO,
              )}'e kadar onaylayacak. Onaylanınca bu sayfada göreceksin.`
            : "Talebin ustana iletildi. Onaylanınca bu sayfada göreceksin."
        }
      >
        {summary}
        <LiveHint />
        <PushOptin
          className="mt-4"
          title="Onaylanınca telefonuna haber verelim mi?"
          hint="İzin verirsen ustan randevunu onayladığı an bildirim düşer — bu sayfayı açık tutmana gerek kalmaz."
          activeText="Bildirim açık — onaylanınca haber vereceğiz"
          onSubscribe={(sub) => savePushSubscription(token, sub)}
          onUnsubscribe={(endpoint) => removePushSubscription(token, endpoint)}
          // Şeritten önceden izin verildiyse hazır aboneliği bu randevuya bağla.
          rebindOnLoad
        />
        <CancelButton token={token} onCancelled={onCancelled} />
      </Shell>
    );
  }

  // 2) Onaylandı — kutlama.
  if (view.status === "confirmed") {
    return (
      <Shell
        tone="ok"
        icon={<CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />}
        title="Randevun onaylandı! 🎉"
        text="Ustan talebini onayladı — seni bekliyoruz. Görüşmek üzere!"
      >
        {summary}
        <CancelButton token={token} onCancelled={onCancelled} />
      </Shell>
    );
  }

  // 2.5) Müşteri kendisi iptal etti — suçlamasız, teşekkürlü mesaj.
  if (view.status === "cancelled" && selfCancelled) {
    return (
      <Shell
        tone="soft"
        icon={<CalendarX2 className="size-7 text-muted-foreground" />}
        title="Randevunu iptal ettin"
        text="Randevun iptal edildi ve o saat tekrar boşaldı — haber verdiğin için teşekkürler. Fikrin değişirse aşağıdan yeni bir randevu alabilirsin."
      >
        {summary}
        <CallCta />
      </Shell>
    );
  }

  // 3) Zaman aşımı — YUMUŞAK, suçlamasız, aksiyonlu.
  if (view.status === "cancelled" && view.timedOut) {
    return (
      <Shell
        tone="soft"
        icon={<CalendarX2 className="size-7 text-muted-foreground" />}
        title="Randevun kesinleşemedi"
        text="Ustamız yoğunluktan ötürü zamanında dönemedi, talebin otomatik kapandı. Üzgünüz! Bizi arayarak hemen yeni bir saat ayarlayabilir ya da sitemizden tekrar deneyebilirsin."
      >
        {summary}
        <CallCta />
      </Shell>
    );
  }

  // 4) İptal / red (elle).
  if (view.status === "cancelled") {
    return (
      <Shell
        tone="soft"
        icon={<CalendarX2 className="size-7 text-muted-foreground" />}
        title="Randevun gerçekleştirilemedi"
        text="Bu randevu iptal edildi. Dilersen bizi arayarak yeni bir saat ayarlayabilir ya da sitemizden tekrar deneyebilirsin."
      >
        {summary}
        <CallCta />
      </Shell>
    );
  }

  // 5) Tamamlandı / gelmedi — geçmişte kaldı.
  const completed = view.status === "completed";
  return (
    <Shell
      tone="soft"
      icon={<CalendarCheck2 className="size-7 text-sky-600 dark:text-sky-400" />}
      title={completed ? "Randevun tamamlandı" : "Randevu geçmişte kaldı"}
      text={
        completed
          ? "Bizi tercih ettiğin için teşekkürler — yeniden bekleriz!"
          : "Bu randevu geçmişte kaldı. Yeni bir randevu için sitemizi kullanabilirsin."
      }
    >
      {summary}
    </Shell>
  );
}

/**
 * Müşterinin kendi randevusunu iptal ettiği düğme. Yanlışlıkla iptali önlemek
 * için iki adımlı: önce "İptal et" bağlantısı, sonra inline onay kutusu.
 * Başarılıysa üst bileşene güncel görünümü bildirir (kart "iptal edildi"ye döner).
 */
function CancelButton({
  token,
  onCancelled,
}: {
  token: string;
  onCancelled: (view: CustomerStatusView) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelOwnAppointment(token);
      if (res.ok) onCancelled(res.view);
      else setError(res.message);
    });
  }

  if (!confirming) {
    return (
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
        >
          Gelemeyecek misin? Randevunu iptal et
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 text-center">
      <p className="text-sm font-medium">Randevunu iptal etmek istediğine emin misin?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        İptal edince bu saat başkalarına açılır ve geri alınamaz.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={doCancel}
        >
          {pending ? <Loader2 className="animate-spin" /> : <X />}
          Evet, iptal et
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Vazgeç
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

function LiveHint() {
  return (
    <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/60" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
      </span>
      Bu sayfa otomatik güncellenir — açık bırakabilir ya da sonra tekrar
      açabilirsin.
    </p>
  );
}

function CallCta() {
  return (
    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
      <a
        href={telHref(siteConfig.phone)}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
      >
        <Phone className="size-4" />
        Dükkânı ara: {siteConfig.phone}
      </a>
      <Link
        href="/randevu"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
      >
        Yeni randevu al
      </Link>
    </div>
  );
}

// ── Ortak kabuk + özet ──────────────────────────────────────────────────

const TONE_RING: Record<"pending" | "ok" | "soft", string> = {
  pending: "border-amber-500/30 bg-amber-500/[0.04]",
  ok: "border-emerald-500/30 bg-emerald-500/[0.04]",
  soft: "border-border bg-card",
};

function Shell({
  tone,
  icon,
  title,
  text,
  children,
}: {
  tone: "pending" | "ok" | "soft";
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border p-6 text-center sm:p-8", TONE_RING[tone])}>
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
        {icon}
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground text-balance">
        {text}
      </p>
      {children && <div className="mt-5 text-left">{children}</div>}
    </div>
  );
}

function AppointmentSummary({
  serviceName,
  barberName,
  startsAtISO,
  reference,
}: {
  serviceName: string;
  barberName: string;
  startsAtISO: string;
  reference: string;
}) {
  const rows: [string, string][] = [
    ["Tarih", `${formatDateLong(startsAtISO)} · ${formatClock(startsAtISO)}`],
    ["Hizmet", serviceName],
    ["Usta", barberName],
    ["Referans", reference],
  ];
  return (
    <dl className="space-y-2.5 rounded-xl border border-border bg-background/50 p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-sm">
          <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
