"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Hidrasyon uyumsuzluğunu önlemek için client'ta mount olunca ikon göster
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Temayı değiştir"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && (isDark ? <Sun /> : <Moon />)}
    </Button>
  );
}
