"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
} from "lucide-react";
import {
  BarberStep,
  DateStep,
  ServiceStep,
  TimeStep,
} from "@/components/randevu/booking-steps";
import { DetailsStep, type ContactDraft } from "@/components/randevu/details-step";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createAdminAppointment,
  fetchAdminSlots,
} from "@/app/admin/(panel)/randevu-ekle/actions";
import type { BarberChoice } from "@/lib/booking/availability";
import { validateContact, type ContactErrors } from "@/lib/booking/validate";
import type { DayOption } from "@/lib/booking/time";
import { formatDuration, formatPrice } from "@/lib/format";
import { telHref } from "@/lib/format";
import type { Barber, Service } from "@/types";

const EMPTY_DETAILS: ContactDraft = { name: "", phone: "", email: "", notes: "" };

/**
 * PANEL — ELLE RANDEVU EKLEME FORMU (tek sayfa).
 *
 * Müşteri sihirbazının aksine berber acele eder → her şey tek ekranda:
 * hizmet(ler) → usta → tarih → saat → müşteri bilgileri → kaydet.
 * Uygun saatler, seçim değişince sunucudan (slot motoru) çekilir; kayıt
 * `createAdminAppointment` ile yapılır ve doğrudan `confirmed` doğar.
 */
export function NewAppointmentForm({
  services,
  barbers,
  days,
  weekdaysByBarber,
}: {
  services: Service[];
  barbers: Barber[];
  days: DayOption[];
  weekdaysByBarber: Record<string, number[]>;
}) {
  const [serviceIds, setServiceIds] = React.useState<string[]>([]);
  const [barberId, setBarberId] = React.useState<BarberChoice | null>(null);
  const [dateISO, setDateISO] = React.useState<string | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [details, setDetails] = React.useState<ContactDraft>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = React.useState<ContactErrors>({});

  // Uygun saatler
  const [slots, setSlots] = React.useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Gönderim / sonuç
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    reference: string;
    barberName: string;
    phone: string;
  } | null>(null);

  const chosen = services.filter((s) => serviceIds.includes(s.id));
  const totalDuration = chosen.reduce((sum, s) => sum + s.duration_min, 0);
  const totalPrice = chosen.reduce((sum, s) => sum + s.price, 0);

  // Tarih adımında hangi haftagünleri açık? Seçili berbere göre (ya da "any"→hepsi).
  const openWeekdays = React.useMemo(() => {
    const set = new Set<number>();
    const add = (id: string) => (weekdaysByBarber[id] ?? []).forEach((w) => set.add(w));
    if (barberId && barberId !== "any") add(barberId);
    else barbers.forEach((b) => add(b.id));
    return set;
  }, [barberId, barbers, weekdaysByBarber]);

  const canPickTime = serviceIds.length > 0 && barberId !== null && dateISO !== null;

  // Hizmet/usta/tarih hazır olunca uygun saatleri çek. `time` sıfırlaması
  // (seçim geçersizleşince) EFFECT'te DEĞİL, aşağıdaki seçim işleyicilerinde
  // yapılır → effect içinde setState zinciri oluşmaz (React lint kuralı).
  React.useEffect(() => {
    if (!canPickTime) return;
    const sIds = serviceIds;
    const bId = barberId as BarberChoice;
    const dISO = dateISO!;
    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await fetchAdminSlots({ serviceIds: sIds, barberId: bId, dateISO: dISO });
        if (cancelled) return;
        if (res.ok) setSlots(res.times);
        else {
          setSlots([]);
          setSlotsError(res.error);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSlotsError("Uygun saatler yüklenemedi. Lütfen tekrar dene.");
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
    // reloadKey: "tekrar dene" / "slot doldu" sonrası manuel tetikleyici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceIds, barberId, dateISO, reloadKey]);

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setTime(null); // süre değişti → seçili saat geçersiz
  }

  function selectBarber(choice: BarberChoice) {
    if (choice !== barberId) setTime(null); // uygunluk değişebilir
    setBarberId(choice);
  }

  function selectDate(iso: string) {
    if (iso !== dateISO) setTime(null);
    setDateISO(iso);
  }

  function patchDetails(patch: Partial<ContactDraft>) {
    setDetails((d) => ({ ...d, ...patch }));
  }

  async function submit() {
    setSubmitError(null);

    // İstemci tarafı ön doğrulama (sunucu yine doğrular).
    const contact = validateContact(details);
    if (!contact.ok) {
      setFieldErrors(contact.errors);
      setSubmitError("Lütfen müşteri bilgilerini kontrol et.");
      return;
    }
    setFieldErrors({});

    if (serviceIds.length === 0) return setSubmitError("En az bir hizmet seç.");
    if (barberId === null) return setSubmitError("Bir usta seç.");
    if (!dateISO) return setSubmitError("Bir gün seç.");
    if (!time) return setSubmitError("Bir saat seç.");

    setSubmitting(true);
    const res = await createAdminAppointment({
      serviceIds,
      barberId,
      dateISO,
      time,
      name: details.name,
      phone: details.phone,
      email: details.email || undefined,
      notes: details.notes || undefined,
    });
    setSubmitting(false);

    if (res.ok) {
      setResult({
        reference: res.reference,
        barberName: res.barberName,
        phone: details.phone,
      });
      return;
    }

    if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    if (res.code === "slot_taken") {
      // Slot kapandı → saati sıfırla, listeyi tazele.
      setTime(null);
      setReloadKey((k) => k + 1);
    }
    setSubmitError(res.message);
  }

  function resetForm() {
    setServiceIds([]);
    setBarberId(null);
    setDateISO(null);
    setTime(null);
    setDetails(EMPTY_DETAILS);
    setFieldErrors({});
    setSlots(null);
    setSubmitError(null);
    setResult(null);
  }

  // ── Başarı ekranı ──
  if (result) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10">
          <CheckCircle2 className="size-7 text-brand" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold">Randevu eklendi 🎉</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{result.barberName}</span> ustanın
          takvimine onaylı olarak işlendi.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-sm">
          Ref: {result.reference}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={resetForm}>
            <Plus />
            Yeni randevu ekle
          </Button>
          <Link
            href="/admin/randevular"
            className={buttonVariants({ variant: "outline" })}
          >
            Randevulara git
          </Link>
          <a
            href={telHref(result.phone)}
            className={buttonVariants({ variant: "ghost" })}
          >
            <Phone />
            Müşteriyi ara
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section step={1} title="Hizmet(ler)">
        <ServiceStep services={services} selected={serviceIds} onToggle={toggleService} />
      </Section>

      <Section step={2} title="Usta">
        <BarberStep barbers={barbers} selected={barberId} onSelect={selectBarber} />
      </Section>

      <Section step={3} title="Tarih">
        <DateStep
          days={days}
          openWeekdays={openWeekdays}
          selected={dateISO}
          onSelect={selectDate}
        />
      </Section>

      <Section step={4} title="Saat">
        {!canPickTime ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Önce hizmet, usta ve tarih seç — uygun saatler burada çıkacak.
          </p>
        ) : (
          <TimeStep
            loading={slotsLoading}
            error={slotsError}
            times={slots}
            selected={time}
            onSelect={setTime}
            onBackToDate={() => setReloadKey((k) => k + 1)}
          />
        )}
      </Section>

      <Section step={5} title="Müşteri bilgileri">
        <DetailsStep value={details} errors={fieldErrors} onChange={patchDetails} />
      </Section>

      {/* Özet + kaydet */}
      <div className="sticky bottom-4 z-10 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur sm:p-5">
        {chosen.length > 0 && (
          <p className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {chosen.length} hizmet · {formatDuration(totalDuration)}
              {time && dateISO ? ` · ${time}` : ""}
            </span>
            <span className="font-heading text-lg font-bold text-brand">
              {formatPrice(totalPrice)}
            </span>
          </p>
        )}
        {submitError && (
          <p className="mb-3 flex items-start gap-1.5 text-sm text-destructive" aria-live="polite">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {submitError}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={submitting}
          onClick={submit}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            <>
              <CalendarPlus />
              Randevuyu ekle
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Numaralı bölüm başlığı + içerik. */
function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading font-semibold">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground tabular-nums">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
