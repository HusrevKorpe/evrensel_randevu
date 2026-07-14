import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/admin/page-header";
import { NewAppointmentForm } from "@/components/admin/new-appointment-form";
import { HORIZON_DAYS } from "@/lib/booking/config";
import { buildDayOptions } from "@/lib/booking/time";
import { getBarberWeekdays, getBarbers, getServices } from "@/lib/data";

export const metadata: Metadata = { title: "Randevu Ekle" };

/**
 * PANEL — ELLE RANDEVU EKLEME sayfası.
 * Telefonla/kapıdan gelen müşteriyi berber buradan sisteme işler; böylece
 * takvim gerçeği yansıtır ve o slot online müşteriye kapanır (çift randevu önlenir).
 *
 * Her istekte taze render: takvim günleri "bugün"e göre sunucuda üretilir.
 */
export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  // Auth + herkese açık veriler paralel. Giriş yoksa requireAdmin yönlendirir.
  const [, services, barbers, weekdaysByBarber] = await Promise.all([
    requireAdmin(),
    getServices(),
    getBarbers(),
    getBarberWeekdays(),
  ]);
  const days = buildDayOptions(HORIZON_DAYS);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Randevu Ekle"
        description="Telefonla veya kapıdan gelen müşteriyi takvime işle. Randevu onaylı olarak eklenir."
      />
      <NewAppointmentForm
        services={services}
        barbers={barbers}
        days={days}
        weekdaysByBarber={weekdaysByBarber}
      />
    </div>
  );
}
