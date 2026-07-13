import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon } from "@/components/site/instagram-icon";
import { Section, SectionHeading } from "@/components/site/section";
import type { ShopDay } from "@/lib/data";
import { telHref } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Çalışma saatleri + iletişim + harita.
 * `hours` DB'den hesaplanmış dükkan saatleri, `today` bugünün gün indeksi
 * (bugünün satırını vurgulamak için).
 */
export function HoursContactSection({
  hours,
  today,
}: {
  hours: ShopDay[];
  today: number;
}) {
  const mapsQuery = encodeURIComponent(siteConfig.address);

  return (
    <Section id="iletisim">
      <SectionHeading
        eyebrow="İletişim"
        eyebrowLine={false}
        title="Bize ulaş"
        description="Çalışma saatlerimiz, konumumuz ve iletişim bilgilerimiz aşağıda."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {/* Sol: saatler + iletişim */}
        <div className="space-y-6">
          {/* Çalışma saatleri */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-brand" />
              <h3 className="font-heading text-lg font-semibold">
                Çalışma Saatleri
              </h3>
            </div>
            <ul className="mt-4 divide-y divide-border/60">
              {hours.map((day) => {
                const isToday = day.weekday === today;
                return (
                  <li
                    key={day.weekday}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span
                      className={cn(
                        "flex items-center gap-2",
                        isToday
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {day.label}
                      {isToday && (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                          Bugün
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        day.open ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {day.open ? `${day.start} – ${day.end}` : "Kapalı"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* İletişim bilgileri */}
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-6">
            <a
              href={telHref(siteConfig.phone)}
              className="flex items-center gap-3 text-sm transition-colors hover:text-brand"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Phone className="size-4" />
              </span>
              {siteConfig.phone}
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="flex items-center gap-3 text-sm transition-colors hover:text-brand"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <Mail className="size-4" />
              </span>
              {siteConfig.email}
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm transition-colors hover:text-brand"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <MapPin className="size-4" />
              </span>
              {siteConfig.address}
            </a>
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm transition-colors hover:text-brand"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                <InstagramIcon className="size-4" />
              </span>
              {siteConfig.instagramHandle}
            </a>
          </div>
        </div>

        {/* Sağ: harita (Google Maps gömme — API anahtarı gerekmez) */}
        <div className="min-h-[320px] overflow-hidden rounded-2xl border border-border">
          <iframe
            title="Konumumuz"
            src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
            className="size-full min-h-[320px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </Section>
  );
}
