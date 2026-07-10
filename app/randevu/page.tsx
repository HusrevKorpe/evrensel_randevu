import type { Metadata } from "next";
import { BookingWizard } from "@/components/randevu/booking-wizard";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { HORIZON_DAYS } from "@/lib/booking/config";
import { buildDayOptions } from "@/lib/booking/time";
import { getBarberWeekdays, getBarbers, getServices } from "@/lib/data";

export const metadata: Metadata = {
  title: "Randevu Al",
  description:
    "Online randevunu saniyeler içinde al: hizmetini, ustanı ve uygun saatini seç.",
  alternates: { canonical: "/randevu" },
};

/**
 * Bu sayfa her istekte taze render edilmeli: takvim günleri "bugün"e göre
 * sunucuda üretiliyor. (Veri katmanı artık çerezsiz olduğundan Next bunu
 * statik sanabilirdi — o zaman gün listesi bayatlardı.)
 */
export const dynamic = "force-dynamic";

/**
 * Randevu sayfası — Faz 3.
 * Server component: herkese açık verileri (hizmet, berber, çalışma günleri)
 * paralel çeker ve istemci sihirbazına prop olarak verir. Takvim günleri
 * sunucuda üretilir ki "bugün" dükkan saatine göre doğru olsun.
 */
export default async function RandevuPage() {
  const [services, barbers, weekdaysByBarber] = await Promise.all([
    getServices(),
    getBarbers(),
    getBarberWeekdays(),
  ]);
  const days = buildDayOptions(HORIZON_DAYS);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
          <BookingWizard
            services={services}
            barbers={barbers}
            days={days}
            weekdaysByBarber={weekdaysByBarber}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
