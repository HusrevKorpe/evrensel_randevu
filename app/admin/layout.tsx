import type { Metadata } from "next";

/**
 * /admin altındaki HER sayfayı kapsayan ince katman (giriş sayfası dahil).
 * Tek işi metadata: admin sayfaları arama motorlarına kapalı (noindex) —
 * robots.txt'teki disallow'un yanında ikinci emniyet kemeri.
 */
export const metadata: Metadata = {
  title: "Yönetim Paneli",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
