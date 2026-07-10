import { Award, CalendarCheck, Clock, Sparkles } from "lucide-react";
import { BookButton } from "@/components/site/book-button";
import { Section, SectionHeading } from "@/components/site/section";
import { siteConfig } from "@/lib/site";

/** "Neden biz" değerleri. */
const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Kolay online randevu",
    text: "Saniyeler içinde uygun saati seç, telefonla uğraşma.",
  },
  {
    icon: Sparkles,
    title: "Hijyen & konfor",
    text: "Her müşteri için steril ekipman, ferah bir ortam.",
  },
  {
    icon: Award,
    title: "Uzman ustalar",
    text: "Yılların deneyimiyle sana en yakışan kesim.",
  },
  {
    icon: Clock,
    title: "Zamanında hizmet",
    text: "Randevun saatinde başlar, vaktin bize emanet.",
  },
];

export function WhyUsSection() {
  return (
    <Section id="hakkimizda" className="bg-muted/30">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* Sol: hikâye */}
        <div>
          <SectionHeading
            align="left"
            eyebrow="Hakkımızda"
            title="Neden bizi seçmelisin?"
          />
          <p className="mt-4 text-muted-foreground">
            {siteConfig.foundedYear}&apos;dan beri mahallenin güvenilir
            berberiyiz. Modern kesim teknikleri, kaliteli ürünler ve samimi bir
            ortamda; saç, sakal ve bakımda fark yaratıyoruz. Amacımız sadece
            tıraş değil — kendini iyi hissederek çıkacağın bir deneyim sunmak.
          </p>
          <div className="mt-8">
            <BookButton />
          </div>
        </div>

        {/* Sağ: özellik kartları */}
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
