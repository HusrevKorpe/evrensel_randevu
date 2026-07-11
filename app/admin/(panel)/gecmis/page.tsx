import type { Metadata } from "next";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/auth/dal";
import { getPastAppointments, type AdminAppointment } from "@/lib/admin/data";
import { shopDateTimeOf } from "@/lib/booking/time";
import { formatDateLong } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentCard } from "@/components/admin/appointment-card";
import { HistoryPagination } from "@/components/admin/history-pagination";

export const metadata: Metadata = { title: "Geçmiş Randevular" };

const PAGE_SIZE = 20;

/** ?page değerini güvenle pozitif tam sayıya çevirir (geçersizse 1). */
function parsePage(v: string | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const requested = parsePage(typeof sp.page === "string" ? sp.page : undefined);
  const { items, total, page } = await getPastAppointments(requested, PAGE_SIZE);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Kartları dükkan yerel gününe göre grupla — liste zaten yeniden eskiye
  // sıralı geldiği için ardışık aynı günleri toplamak yeterli.
  const groups: { dateISO: string; items: AdminAppointment[] }[] = [];
  for (const a of items) {
    const dateISO = shopDateTimeOf(a.starts_at).dateISO;
    const last = groups[groups.length - 1];
    if (last && last.dateISO === dateISO) last.items.push(a);
    else groups.push({ dateISO, items: [a] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Geçmiş Randevular"
        description={
          total === 0
            ? "Saati geçen tüm randevular burada listelenir."
            : `Toplam ${total} randevu — iptaller ve gelmeyenler dahil.`
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-16 text-center">
          <History className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Henüz geçmiş randevu yok. Saati geçen randevular burada birikecek.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.dateISO} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {formatDateLong(g.items[0].starts_at)}
              </h2>
              {g.items.map((a) => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
            </section>
          ))}
        </div>
      )}

      <HistoryPagination page={page} lastPage={lastPage} />
    </div>
  );
}
