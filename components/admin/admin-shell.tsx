"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Admin panel kabuğu: solda gezinme (masaüstü sabit sidebar, mobilde çekmece),
 * üstte ince bir bar (mobil menü düğmesi + tema). İçeriği `children` ile alır.
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/admin/randevular", label: "Randevular", icon: CalendarDays },
  { href: "/admin/takvim", label: "Takvim", icon: CalendarRange },
  { href: "/admin/gecmis", label: "Geçmiş", icon: History },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh bg-muted/30">
      {/* ── Masaüstü sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent email={email} onNavigate={() => {}} />
      </aside>

      {/* ── Mobil çekmece ── */}
      {open && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card">
            <SidebarContent email={email} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── İçerik alanı ── */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Menüyü aç"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <Link
            href="/admin"
            className="flex items-center gap-2 font-heading font-bold tracking-tight lg:hidden"
          >
            <Scissors className="size-4 text-brand" />
            Panel
          </Link>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/** Sidebar/çekmece ortak içeriği: marka + gezinme + kullanıcı/çıkış. */
function SidebarContent({
  email,
  onNavigate,
}: {
  email: string;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
        >
          <Scissors className="size-5 text-brand" />
          {siteConfig.name}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Menüyü kapat"
          onClick={onNavigate}
        >
          <X />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {/* Öne çıkan birincil aksiyon: elle randevu ekleme (telefon/kapı) */}
        <Link
          href="/admin/randevu-ekle"
          onClick={onNavigate}
          className={cn(
            "mb-2 flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90",
            pathname === "/admin/randevu-ekle" && "ring-2 ring-brand/40",
          )}
        >
          <CalendarPlus className="size-4" />
          Yeni Randevu
        </Link>

        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="truncate px-3 pb-2 text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="lg"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut />
            Çıkış Yap
          </Button>
        </form>
      </div>
    </>
  );
}
