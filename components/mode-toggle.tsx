"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Tema (koyu/açık) değiştirme düğmesi.
 *
 * İki ikonu da render edip CSS'in `dark:` varyantıyla birini gösteriyoruz.
 * Böylece sunucu ve istemci AYNI HTML'i üretir → hidrasyon uyumsuzluğu olmaz,
 * ayrıca `mounted` state'ine / effect'e gerek kalmaz.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Temayı değiştir"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  );
}
