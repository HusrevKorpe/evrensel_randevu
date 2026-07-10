import { requireAdmin } from "@/lib/auth/dal";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Korumalı panel kabuğu. `(panel)` bir route grubu — URL'e "/panel" EKLEMEZ,
 * sadece bu klasördeki sayfaları ortak bir layout altında toplar. Giriş sayfası
 * (`/admin/giris`) bu grubun DIŞINDA olduğundan bu koruma onu kapsamaz
 * (aksi halde giriş→koru→giriş sonsuz döngüsü olurdu).
 *
 * `requireAdmin()` proxy'den sonraki İKİNCİ güvenlik katmanı: giriş yoksa
 * doğrudan login'e atar.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return <AdminShell email={user.email ?? ""}>{children}</AdminShell>;
}
