import Image from "next/image";
import { Section, SectionHeading } from "@/components/site/section";

/**
 * Galeri — gerçek fotoğraflar (`public/gallery/`).
 * 🙋 Kendi dükkan fotoğraflarını verince bu dosyaları değiştirmen yeterli;
 * dosya adları/sıra aynı kalırsa kodu değiştirmene gerek yok.
 *
 * next/image `fill` ile karonun tamamını kaplar (object-cover) → otomatik
 * boyutlandırma, WebP ve tembel yükleme (performans) bedavaya gelir.
 */
const PHOTOS = [
  { src: "/gallery/gallery-1.jpg", alt: "Modern fade saç kesimi" },
  { src: "/gallery/gallery-2.jpg", alt: "Saç şekillendirme" },
  { src: "/gallery/gallery-3.jpg", alt: "Berber dükkanı" },
  { src: "/gallery/gallery-4.jpg", alt: "Berber dükkanı iç mekan" },
  { src: "/gallery/gallery-5.jpg", alt: "Ustura ile sakal kesimi" },
  { src: "/gallery/gallery-6.jpg", alt: "Berber koltukları" },
];

export function GallerySection() {
  return (
    <Section id="galeri" className="bg-muted/30">
      <SectionHeading
        eyebrow="Galeri"
        title="Dükkandan kareler"
        description="Ortamımızdan ve işçiliğimizden birkaç kesit."
      />

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {PHOTOS.map((photo) => (
          <div
            key={photo.src}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
