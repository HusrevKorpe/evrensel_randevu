import { ArrowRight, Clock, MapPin, Scissors } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

export default function Home() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      {/* Arka plan: üstten inen yumuşak altın parıltı */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_-5%,color-mix(in_oklch,var(--brand)_16%,transparent),transparent)]" />

      {/* Üst bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-foreground">
            <Scissors className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            {siteConfig.name}
          </span>
        </div>
        <ModeToggle />
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          Kurulum tamamlandı · Faz 0 ✓
        </span>

        <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Sıra beklemek yok.{" "}
          <span className="text-brand">Randevunu al</span>, gel.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground text-balance">
          {siteConfig.description}
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 bg-brand px-7 text-base font-semibold text-brand-foreground hover:bg-brand/90"
          >
            Randevu Al
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" size="lg" className="h-12 px-6 text-base">
            Hizmetleri Gör
          </Button>
        </div>

        {/* Vitrin ipuçları */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-brand" /> Hızlı online randevu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Scissors className="size-4 text-brand" /> Saç · Sakal · Bakım
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-brand" /> Kolay ulaşım
          </span>
        </div>
      </section>

      {/* Alt bilgi */}
      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-center text-xs text-muted-foreground">
        © {siteConfig.name} · Bu bir geliştirme başlangıç sayfasıdır — vitrin Faz
        2&apos;de gelecek.
      </footer>
    </main>
  );
}
