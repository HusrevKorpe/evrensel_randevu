import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tasarım sistemi — bölüm iskeleti.
 * Tüm sayfa bölümleri bu bileşenlerle kurulur ki dikey boşluk, genişlik
 * ve başlık stilleri her yerde AYNI olsun (tutarlılık = profesyonel görünüm).
 *
 * Kurallar:
 *  • Yatay: içerik `max-w-6xl` içinde ortalanır, kenar boşluğu `px-6`.
 *  • Dikey: bölümler arası ritim `py-20` (mobil) / `py-28` (masaüstü).
 *  • `scroll-mt-24`: sabit header'a takılmadan bölüme kaydırma için.
 */
export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 sm:py-28", className)}>
      <div className="mx-auto w-full max-w-6xl px-6">{children}</div>
    </section>
  );
}

/** Bölüm başlığı: küçük üst etiket + ana başlık + açıklama. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  eyebrowLine = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  /** Üst etiketin solundaki kısa çizgiyi göster (varsayılan: gösterme). */
  eyebrowLine?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium text-brand",
            align === "center" && "justify-center",
          )}
        >
          {eyebrowLine && <span className="h-px w-6 bg-brand/60" />}
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-muted-foreground text-balance">{description}</p>
      )}
    </div>
  );
}
