import Image from "next/image";
import Link from "next/link";
import { InstagramIcon } from "@/components/site/instagram-icon";
import { telHref } from "@/lib/format";
import { siteConfig } from "@/lib/site";

// Header'daki menüyle aynı gerekçe: hedefler MUTLAK (`/#...`) — böylece
// footer alt sayfalarda da (onay/durum) ana sayfanın ilgili bölümüne götürür.
const NAV = [
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/#hakkimizda", label: "Hakkımızda" },
  { href: "/#ekip", label: "Ekip" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#iletisim", label: "İletişim" },
];

export function SiteFooter() {
  // Server component olduğu için yılı burada güvenle hesaplayabiliriz.
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marka */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt={`${siteConfig.name} logosu`}
                width={40}
                height={40}
                className="size-10 rounded-full"
              />
              <span className="font-heading text-lg font-bold tracking-tight">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {siteConfig.slogan}. Randevunu online al, sıra bekleme.
            </p>
          </div>

          {/* Menü */}
          <div>
            <h4 className="text-sm font-semibold">Menü</h4>
            <ul className="mt-3 space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h4 className="text-sm font-semibold">İletişim</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={telHref(siteConfig.phone)}
                  className="transition-colors hover:text-foreground"
                >
                  {siteConfig.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="transition-colors hover:text-foreground"
                >
                  {siteConfig.email}
                </a>
              </li>
              <li className="max-w-[16rem]">{siteConfig.address}</li>
              <li>
                <a
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <InstagramIcon className="size-4" />
                  {siteConfig.instagramHandle}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {siteConfig.name}. Tüm hakları saklıdır.
          </p>
          <p>Randevunu online al 💈</p>
        </div>
      </div>
    </footer>
  );
}
