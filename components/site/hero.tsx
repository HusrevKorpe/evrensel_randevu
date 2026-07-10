import Link from "next/link";
import { Star } from "lucide-react";
import { BookButton } from "@/components/site/book-button";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Güven veren kısa istatistikler (placeholder — gerçek rakamla değiştirilebilir). */
const STATS = [
  { value: "15+", label: "Yıllık tecrübe" },
  { value: "5.000+", label: "Mutlu müşteri" },
  { value: "4.9", label: "Ortalama puan" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Üstten inen yumuşak altın parıltı */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,color-mix(in_oklch,var(--brand)_18%,transparent),transparent)]" />

      <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center sm:py-28">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Star className="size-3.5 fill-brand text-brand" />
          {siteConfig.slogan}
        </span>

        <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Sıra beklemek yok.{" "}
          <span className="text-brand">Randevunu al</span>, gel.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          {siteConfig.description}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <BookButton className="h-12 px-7" />
          <Link
            href="#hizmetler"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 px-6 text-base",
            )}
          >
            Hizmetleri Gör
          </Link>
        </div>

        {/* İstatistik şeridi */}
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-heading text-2xl font-bold sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
