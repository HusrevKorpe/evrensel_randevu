"use client"; // Hata sınırları client component olmak zorunda

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";

/**
 * Beklenmedik çalışma zamanı hataları için yedek ekran.
 * `unstable_retry` (bu Next sürümünün API'si) segmenti yeniden çekip
 * yeniden dener — geçici bir ağ/DB sorunuysa kullanıcı tek tıkla kurtulur.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Sunucu loglarında zaten var; burada geliştirici konsoluna da düşsün.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        Bir şeyler ters gitti
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Beklenmedik bir hata oluştu. Tekrar deneyebilirsin; sorun sürerse bizi{" "}
        <a className="underline underline-offset-4" href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}>
          {siteConfig.phone}
        </a>{" "}
        numarasından arayabilirsin.
      </p>
      <div className="mt-2 flex gap-3">
        <Button onClick={() => unstable_retry()}>Tekrar dene</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Anasayfaya dön
        </Link>
      </div>
    </main>
  );
}
