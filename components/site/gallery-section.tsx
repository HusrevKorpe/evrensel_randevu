import Image from "next/image";
import { Section, SectionHeading } from "@/components/site/section";

/**
 * Galeri — dükkanın gerçek fotoğrafları (`public/gallery/`).
 * 🙋 Yeni fotoğraf eklemek/değiştirmek için `public/gallery/` içindeki
 * dosyaları değiştirip aşağıdaki listeyi güncellemen yeterli.
 *
 * Fotoğraflar 3:4 dikey; karo da 3:4 olduğu için kırpılmadan görünürler.
 * next/image `fill` ile karoyu kaplar → otomatik boyutlandırma, WebP ve
 * tembel yükleme (performans) bedavaya gelir.
 */
const PHOTOS = [
  { src: "/gallery/foto-a1.jpg", alt: "Dokulu şekillendirme ile fade saç kesimi" },
  { src: "/gallery/foto-a2.jpg", alt: "Dalgalı saç kesimi ve ıslak şekillendirme" },
  { src: "/gallery/foto-a3.jpg", alt: "Kıvırcık saça taper fade ve sakal tıraşı" },
];

export function GallerySection() {
  return (
    <Section id="galeri" className="bg-muted/30">
      <SectionHeading
        eyebrow="Galeri"
        title="Dükkandan kareler"
        description="Ortamımızdan ve işçiliğimizden birkaç kesit."
      />

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {PHOTOS.map((photo) => (
          <div
            key={photo.src}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 640px) 33vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
