import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yönetici Girişi",
  robots: { index: false, follow: false }, // arama motorları panele girmesin
};

/**
 * Giriş sayfası. `next` sorgu parametresi, giriş yapmadan gitmeye çalıştığın
 * sayfayı taşır → giriş sonrası oraya döneriz. (searchParams Next 16'da Promise.)
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
          >
            <Scissors className="size-5 text-brand" />
            {siteConfig.name}
          </Link>
          <h1 className="mt-6 font-heading text-2xl font-bold">Yönetici Girişi</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Randevuları yönetmek için giriş yap.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <LoginForm next={safeNext} />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Siteye dön
          </Link>
        </p>
      </div>
    </main>
  );
}
