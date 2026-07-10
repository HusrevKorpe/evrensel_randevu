import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Randevu Al" ana eylem butonu — site genelinde tek görünüm.
 * Şimdilik /randevu placeholder sayfasına gider; Faz 3'te gerçek
 * randevu sihirbazı oraya gelecek.
 */
export function BookButton({
  className,
  children = "Randevu Al",
  showIcon = true,
  onClick,
}: {
  className?: string;
  children?: ReactNode;
  showIcon?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/randevu"
      onClick={onClick}
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-11 gap-2 bg-brand px-6 text-base font-semibold text-brand-foreground hover:bg-brand/90",
        className,
      )}
    >
      {children}
      {showIcon && <ArrowRight className="size-4" />}
    </Link>
  );
}
