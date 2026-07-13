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
  const [flash, setFlash] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    reference: string;
    barberName: string;
    trackUrl: string | null;
  } | null>(null);

  // Seçilen hizmetler — `services` zaten sort_order sırasında olduğundan
  // filtreleme o sırayı korur (özet/başarı ekranı düzenli görünür).
  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const serviceKey = serviceIds.join(","); // effect için sabit (primitive) anahtar
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
    // Hizmet listesini anahtardan geri kur → effect yalnızca primitive'lere
    // bağlı olur (dizi kimliği her render değişmesin diye).
    const sIds = serviceKey ? serviceKey.split(",") : [];
    if (sIds.length === 0 || !barberId || !dateISO) return;
    const bId = barberId;
    const dISO = dateISO;
    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await fetchSlotsAction({ serviceIds: sIds, barberId: bId, dateISO: dISO });
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
  }, [serviceKey, barberId, dateISO, reloadKey]);

  // ── Seçim işleyicileri (bir üst adımı değiştirmek alt seçimleri sıfırlar) ──
  // Hizmet ÇOKLU seçilir: karta basınca ekler/çıkarır (otomatik ilerlemez).
  // Seçim değişince süre değişir → uygun saat seçimi artık geçersiz, sıfırla.
  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setTime(null);
  }
  function continueFromServices() {
    if (serviceIds.length === 0) return;
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
  // Adım göstergesindeki numaraya basınca YALNIZCA geriye (tamamlanmış
  // adımlara) gidilir. İleri atlama yok — böylece atlanan adımların seçimi
  // boş kalmaz. Geri gitmek seçimleri korur (sıfırlamayız).
  function goToStep(n: number) {
    if (n < step) setStep(n);
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
    if (serviceIds.length === 0 || !barberId || !dateISO || !time) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createAppointmentAction({
        serviceIds,
        barberId,
        dateISO,
        time,
        name: details.name,
        phone: details.phone,
        email: details.email,
        notes: details.notes,
      });
      if (res.ok) {
        setResult({
          reference: res.reference,
          barberName: res.barberName,
          trackUrl: res.trackUrl,
        });
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
    setServiceIds([]);
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
  if (result && selectedServices.length > 0 && selectedDay && time) {
    return (
      <SuccessView
        reference={result.reference}
        serviceName={selectedServices.map((s) => s.name).join(", ")}
        barberName={result.barberName}
        dayLong={selectedDay.long}
        time={time}
        trackUrl={result.trackUrl}
        onReset={reset}
      />
    );
  }

  return (
    <div>
      <Stepper step={step} onGoTo={goToStep} />

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
              selected={serviceIds}
              onToggle={toggleService}
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
          {step === 6 && selectedServices.length > 0 && selectedDay && time && (
            <SummaryStep
              data={{
                services: selectedServices,
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
        canContinueServices={serviceIds.length > 0}
        onBack={() => setStep((s) => Math.max(1, s - 1))}
        onServicesContinue={continueFromServices}
        onContinue={continueFromDetails}
        onConfirm={confirm}
      />
    </div>
  );
}

// ── Adım göstergesi ─────────────────────────────────────────────────────

function Stepper({ step, onGoTo }: { step: number; onGoTo: (n: number) => void }) {
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
              {/* Tamamlanmış adım → geri dönmek için tıklanabilir.
                  Aktif/ileri adımlar disabled (ileri atlama yok). */}
              <button
                type="button"
                disabled={!done}
                onClick={() => onGoTo(n)}
                aria-label={done ? `${label} adımına dön` : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full text-left transition-opacity",
                  done ? "cursor-pointer hover:opacity-70" : "cursor-default",
                )}
              >
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
              </button>
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
  canContinueServices,
  onBack,
  onServicesContinue,
  onContinue,
  onConfirm,
}: {
  step: number;
  submitting: boolean;
  canContinueServices: boolean;
  onBack: () => void;
  onServicesContinue: () => void;
  onContinue: () => void;
  onConfirm: () => void;
}) {
  // Adım 1 (çoklu hizmet) ve 5/6'da birincil buton var. Diğer adımlarda
  // seçim otomatik ilerlettiği için buton yerine ipucu gösterilir.
  const showPrimary = step === 1 || step === 5 || step === 6;
  const onPrimary =
    step === 1 ? onServicesContinue : step === 5 ? onContinue : onConfirm;
  const primaryLabel = step === 6 ? "Talebi Gönder" : "Devam";
  const primaryDisabled = submitting || (step === 1 && !canContinueServices);

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
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="h-11 min-w-40 bg-brand px-6 text-base font-semibold text-brand-foreground hover:bg-brand/90"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Gönderiliyor…
            </>
          ) : (
            primaryLabel
          )}
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Bir seçim yap →</span>
      )}
    </div>
  );
}
