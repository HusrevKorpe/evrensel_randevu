import { Camera, Scissors, Sparkles } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/section";
import { cn } from "@/lib/utils";

/**
 * Galeri — şimdilik stilize placeholder karolar.
 * 🙋 Gerçek fotoğraflar gelince her karonun içine bir görsel (next/image)
 * koyacağız. Karolar bilinçli olarak marka renginde soyut desenler.
 */
const TILES = [
  { icon: Scissors, grad: "from-brand/25 via-transparent to-transparent" },
  { icon: Camera, grad: "from-transparent via-brand/15 to-transparent" },
  { icon: Sparkles, grad: "from-transparent to-brand/20" },
  { icon: Camera, grad: "from-brand/20 to-transparent" },
  { icon: Scissors, grad: "from-transparent via-brand/10 to-brand/25" },
  { icon: Sparkles, grad: "from-brand/15 to-transparent" },
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
        {TILES.map((tile, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br transition-transform duration-500 group-hover:scale-105",
                tile.grad,
              )}
            />
            <div className="absolute inset-0 grid place-items-center">
              <tile.icon className="size-8 text-foreground/15 transition-colors group-hover:text-foreground/25" />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
