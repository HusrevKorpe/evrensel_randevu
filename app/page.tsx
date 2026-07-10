import type { Metadata } from "next";
import { GallerySection } from "@/components/site/gallery-section";
import { Hero } from "@/components/site/hero";
import { BarberShopJsonLd } from "@/components/site/json-ld";
import { HoursContactSection } from "@/components/site/hours-contact-section";
import { ServicesSection } from "@/components/site/services-section";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TeamSection } from "@/components/site/team-section";
import { WhyUsSection } from "@/components/site/why-us-section";
import {
  getBarbers,
  getServices,
  getShopHours,
  getTodayWeekday,
} from "@/lib/data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Anasayfa STATİK üretilir (veri katmanı çerezsiz) ve 5 dakikada bir
 * arka planda tazelenir → ilk yükleme çok hızlı. Admin hizmet/saat
 * değiştirdiğinde action'lar revalidatePath("/") ile anında tazeler.
 */
export const revalidate = 300;

export default async function Home() {
  // Üç sorgu birbirinden bağımsız → paralel çekelim (Promise.all), tek tek
  // beklemekten hızlı olur.
  const [services, barbers, hours] = await Promise.all([
    getServices(),
    getBarbers(),
    getShopHours(),
  ]);
  const today = getTodayWeekday();

  return (
    <>
      <BarberShopJsonLd hours={hours} />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ServicesSection services={services} />
        <WhyUsSection />
        <TeamSection barbers={barbers} />
        <GallerySection />
        <HoursContactSection hours={hours} today={today} />
      </main>
      <SiteFooter />
    </>
  );
}
