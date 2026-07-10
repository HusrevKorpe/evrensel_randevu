"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Scissors, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { BookButton } from "@/components/site/book-button";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Sabit (sticky) üst bar.
 * Client component çünkü iki interaktif davranışı var:
 *  1. Mobilde açılıp kapanan hamburger menü (useState)
 *  2. Sayfa kaydırılınca arka planın belirginleşmesi (scroll dinleyici)
 */

const NAV = [
  { href: "#hizmetler", label: "Hizmetler" },
  { href: "#hakkimizda", label: "Hakkımızda" },
  { href: "#ekip", label: "Ekip" },
  { href: "#galeri", label: "Galeri" },
  { href: "#iletisim", label: "İletişim" },
];

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors",
        scrolled || open
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="#top"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-foreground">
            <Scissors className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        {/* Masaüstü gezinme */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sağ aksiyonlar */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <BookButton
            showIcon={false}
            className="hidden h-9 px-4 text-sm sm:inline-flex"
          />
          {/* Mobil menü düğmesi */}
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Menüyü aç/kapat"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobil açılır menü */}
      {open && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <BookButton
              onClick={() => setOpen(false)}
              className="mt-2"
            />
          </nav>
        </div>
      )}
    </header>
  );
}
