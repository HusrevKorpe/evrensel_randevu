import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Randevu Al",
};

/**
 * Randevu sayfası — şimdilik placeholder.
 * Gerçek adım adım randevu sihirbazı Faz 3'te buraya gelecek.
 * Amaç: anasayfadaki "Randevu Al" butonları 404 vermesin, akış hazır dursun.
 */
export default function RandevuPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <CalendarClock className="size-7" />
      </span>
      <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight text-balance">
        Randevu akışı çok yakında
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground text-balance">
        Online randevu sihirbazı Faz 3&apos;te geliyor: hizmet seç, ustanı seç,
        uygun saati kap. Şimdilik anasayfadan bize ulaşabilirsin.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "outline" }), "mt-8 h-11 px-5")}
      >
        <ArrowLeft className="size-4" />
        Anasayfaya dön
      </Link>
    </main>
  );
}
