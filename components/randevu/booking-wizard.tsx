"use client";

import * as React from "react";
import {
  AlertCircle,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import {
  BarberStep,
  DateStep,
  ServiceStep,
  TimeStep,
} from "@/components/randevu/booking-steps";
import { DetailsStep, type ContactDraft } from "@/components/randevu/details-step";
import { SummaryStep, SuccessView } from "@/components/randevu/summary-step";
import { Button } from "@/components/ui/button";
import {
  createAppointmentAction,
  fetchSlotsAction,
} from "@/app/randevu/actions";
import type { BarberChoice } from "@/lib/booking/availability";
import { validateContact, type ContactErrors } from "@/lib/booking/validate";
import type { DayOption } from "@/lib/booking/time";
import { cn } from "@/lib/utils";
import type { Barber, Service } from "@/types";

const STEP_LABELS = ["Hizmet", "Usta", "Tarih", "Saat", "Bilgiler", "Onay"] as const;
const STEP_TITLES = [
  "Hangi hizmeti istiyorsun?",
  "Ustanı seç",
  "Hangi gün gelmek istersin?",
  "Uygun bir saat seç",
  "Seni nasıl bulalım?",
  "Son bir kontrol",
] as const;

const EMPTY_DETAILS: ContactDraft = { name: "", phone: "", email: "", notes: "" };

/**
 * 6 ADIMLI RANDEVU SİHİRBAZI — Faz 3'ün yüzü.
 * Tüm adım durumunu burada tutarız (ileri-geri gidince veri kaybolmasın).
 * Veri çekme (uygun saatler) ve kayıt, sunucudaki Server Action'larla yapılır.
 */
export function BookingWizard({
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
  const [step, setStep] = React.useState(1);
  const [serviceId, setServiceId] = React.useState<string | null>(null);
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
  const [flash, setFlash] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    reference: string;
    barberName: string;
  } | null>(null);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const selectedDay = days.find((d) => d.iso === dateISO) ?? null;
  const barberLabel =
    barberId === "any"
      ? "Farketmez"
      : (barbers.find((b) => b.id === barberId)?.name ?? "");

  // Seçili berbere göre AÇIK haftagünleri (kapalı günleri takvimde kilitlemek için).
  const openWeekdays = React.useMemo(() => {
    if (barberId === "any" || barberId === null) {
      const all = new Set<number>();
      Object.values(weekdaysByBarber).forEach((arr) => arr.forEach((w) => all.add(w)));
      return all;
    }
    return new Set(weekdaysByBarber[barberId] ?? []);
  }, [barberId, weekdaysByBarber]);

  // Hizmet/usta/tarih hazır olunca uygun saatleri çek. Süre değiştiğinden
  // her değişiklikte yeniden hesaplanır. reloadKey → "saat doldu" sonrası zorla yenile.
  React.useEffect(() => {
    if (!serviceId || !barberId || !dateISO) return;
    // Daraltılmış (null olmayan) değerleri sabitleyelim — iç fonksiyonda kullanılacak.
    const sId = serviceId;
    const bId = barberId;
    const dISO = dateISO;
    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await fetchSlotsAction({ serviceId: sId, barberId: bId, dateISO: dISO });
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
  }, [serviceId, barberId, dateISO, reloadKey]);

  // ── Seçim işleyicileri (bir üst adımı değiştirmek alt seçimleri sıfırlar) ──
  function selectService(id: string) {
    if (id !== serviceId) setTime(null);
    setServiceId(id);
    setStep(2);
  }
  function selectBarber(b: BarberChoice) {
    if (b !== barberId) setTime(null);
    setBarberId(b);
    setStep(3);
  }
  function selectDate(iso: string) {
    if (iso !== dateISO) setTime(null);
    setDateISO(iso);
    setStep(4);
  }
  function selectTime(t: string) {
    setTime(t);
    setFlash(null);
    setStep(5);
  }
  function updateDetails(patch: Partial<ContactDraft>) {
    setDetails((prev) => ({ ...prev, ...patch }));
    // Düzeltilen alanın hatasını temizle
    const key = Object.keys(patch)[0] as keyof ContactErrors;
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function continueFromDetails() {
    const check = validateContact(details);
    if (!check.ok) {
      setFieldErrors(check.errors);
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setStep(6);
  }

  async function confirm() {
    if (!serviceId || !barberId || !dateISO || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createAppointmentAction({
        serviceId,
        barberId,
        dateISO,
        time,
        name: details.name,
        phone: details.phone,
        email: details.email,
        notes: details.notes,
      });
      if (res.ok) {
        setResult({ reference: res.reference, barberName: res.barberName });
        return;
      }
      if (res.code === "slot_taken") {
        // Saat az önce doldu → saat adımına dön, listeyi zorla yenile.
        setTime(null);
        setFlash(res.message);
        setReloadKey((k) => k + 1);
        setStep(4);
      } else if (res.code === "invalid" && res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
        setStep(5);
      } else {
        setSubmitError(res.message);
      }
    } catch {
      setSubmitError("Beklenmedik bir hata oldu. Lütfen tekrar dene.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(1);
    setServiceId(null);
    setBarberId(null);
    setDateISO(null);
    setTime(null);
    setDetails(EMPTY_DETAILS);
    setFieldErrors({});
    setSlots(null);
    setSlotsError(null);
    setSubmitError(null);
    setFlash(null);
    setResult(null);
  }

  // ── Başarı ekranı ──
  if (result && selectedService && selectedDay && time) {
    return (
      <SuccessView
        reference={result.reference}
        serviceName={selectedService.name}
        barberName={result.barberName}
        dayLong={selectedDay.long}
        time={time}
        onReset={reset}
      />
    );
  }

  return (
    <div>
      <Stepper step={step} />

      <div className="mt-6">
        <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {STEP_TITLES[step - 1]}
        </h1>

        {flash && step === 4 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3.5 py-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>{flash}</span>
          </div>
        )}

        <div className="mt-5">
          {step === 1 && (
            <ServiceStep
              services={services}
              selected={serviceId}
              onSelect={selectService}
            />
          )}
          {step === 2 && (
            <BarberStep
              barbers={barbers}
              selected={barberId}
              onSelect={selectBarber}
            />
          )}
          {step === 3 && (
            <DateStep
              days={days}
              openWeekdays={openWeekdays}
              selected={dateISO}
              onSelect={selectDate}
            />
          )}
          {step === 4 && (
            <TimeStep
              loading={slotsLoading}
              error={slotsError}
              times={slots}
              selected={time}
              onSelect={selectTime}
              onBackToDate={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <DetailsStep
              value={details}
              errors={fieldErrors}
              onChange={updateDetails}
            />
          )}
          {step === 6 && selectedService && selectedDay && time && (
            <SummaryStep
              data={{
                service: selectedService,
                barberLabel,
                dayLong: selectedDay.long,
                time,
                name: details.name.trim(),
                phone: details.phone.trim(),
              }}
              submitError={submitError}
            />
          )}
        </div>
      </div>

      {/* Alt gezinme çubuğu */}
      <Footer
        step={step}
        submitting={submitting}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onContinue={continueFromDetails}
        onConfirm={confirm}
      />
    </div>
  );
}

// ── Adım göstergesi ─────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <div>
      {/* Mobil: kompakt */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Adım {step}
            <span className="text-muted-foreground"> / {STEP_LABELS.length}</span>
          </span>
          <span className="font-medium text-brand">{STEP_LABELS[step - 1]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(step / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Masaüstü: numaralı noktalar */}
      <ol className="hidden items-center sm:flex">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold transition-colors",
                    active
                      ? "bg-brand text-brand-foreground"
                      : done
                        ? "bg-brand/15 text-brand"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {n}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {n < STEP_LABELS.length && (
                <span
                  className={cn(
                    "mx-3 h-px flex-1 transition-colors",
                    done ? "bg-brand/40" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Alt gezinme ─────────────────────────────────────────────────────────

function Footer({
  step,
  submitting,
  onBack,
  onContinue,
  onConfirm,
}: {
  step: number;
  submitting: boolean;
  onBack: () => void;
  onContinue: () => void;
  onConfirm: () => void;
}) {
  const showPrimary = step === 5 || step === 6;

  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/60 pt-5">
      {step > 1 ? (
        <Button variant="ghost" onClick={onBack} disabled={submitting} className="h-11 px-4">
          <ChevronLeft className="size-4" />
          Geri
        </Button>
      ) : (
        <span />
      )}

      {showPrimary ? (
        <Button
          onClick={step === 5 ? onContinue : onConfirm}
          disabled={submitting}
          className="h-11 min-w-40 bg-brand px-6 text-base font-semibold text-brand-foreground hover:bg-brand/90"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Gönderiliyor…
            </>
          ) : step === 5 ? (
            "Devam"
          ) : (
            "Randevuyu Onayla"
          )}
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Bir seçim yap →</span>
      )}
    </div>
  );
}
