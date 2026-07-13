import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/section";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/types";

/**
 * Hizmetler bölümü — veriler DB'den (`services` tablosu) geliyor.
 * Server component'ten prop olarak alır; kendi başına veri çekmez
 * (böylece anasayfa tek seferde paralel veri çeker, hız kazanır).
 */
export function ServicesSection({ services }: { services: Service[] }) {
  return (
    <Section id="hizmetler">
      <SectionHeading
        eyebrow="Hizmetler"
        title="Sana en çok yakışan bakım"
        description="Klasik tıraştan modern kesime, sakal şekillendirmeden bakıma kadar hepsi tek yerde. Fiyat ve süre net — sürpriz yok."
      />

      {services.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Hizmetler şu an yüklenemedi. Lütfen daha sonra tekrar dene.
        </p>
      ) : (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href="/randevu"
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Scissors className="size-5" />
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {formatDuration(service.duration_min)}
                </span>
              </div>

              <h3 className="mt-4 font-heading text-lg font-semibold">
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                  {service.description}
                </p>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                <span className="font-heading text-xl font-bold text-brand">
                  {formatPrice(service.price)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  Randevu
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
