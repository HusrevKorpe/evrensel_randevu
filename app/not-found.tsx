import Link from "next/link";
import { Scissors } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 404 — olmayan bir adrese gelindiğinde gösterilir (kök layout'un içinde). */
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Scissors className="size-7" />
      </span>
      <p className="font-heading text-5xl font-bold text-brand">404</p>
      <h1 className="font-heading text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Anasayfaya dön
        </Link>
        <Link href="/randevu" className={cn(buttonVariants(), "font-semibold")}>
          Randevu Al
        </Link>
      </div>
    </main>
  );
}
