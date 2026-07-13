import Link from "next/link";
import { Section, SectionHeading } from "@/components/site/section";
import type { Barber } from "@/types";

/** İsimden baş harfleri üretir: "Ahmet Usta" → "AU". */
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Ekip bölümü — berberler DB'den (`barbers` tablosu) geliyor.
 * Henüz gerçek fotoğraf yok; avatar yerine baş harflerle şık bir rozet
 * gösteriyoruz. Fotoğraf eklenince (avatar_url) buraya görsel koyarız.
 */
export function TeamSection({ barbers }: { barbers: Barber[] }) {
  if (barbers.length === 0) return null;

  return (
    <Section id="ekip">
      <SectionHeading
        eyebrow="Ekip"
        title="Usta ellerdesin"
        description="Deneyimli ekibimiz, tercih ettiğin ustayla ya da 'farketmez' diyerek en uygun saate randevu almanı sağlar."
      />

      <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        {barbers.map((barber) => (
          <Link
            key={barber.id}
            href="/randevu"
            className="group flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-brand/40"
          >
            <span className="grid size-20 place-items-center rounded-full bg-brand/10 font-heading text-xl font-bold text-brand">
              {initials(barber.name)}
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold">
              {barber.name}
            </h3>
            {barber.title && (
              <p className="text-sm font-medium text-brand">{barber.title}</p>
            )}
            {barber.bio && (
              <p className="mt-3 text-sm text-muted-foreground">{barber.bio}</p>
            )}
          </Link>
        ))}
      </div>
    </Section>
  );
}
