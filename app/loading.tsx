import { Scissors } from "lucide-react";

/**
 * Sayfa içeriği sunucudan gelirken gösterilen anlık yükleme ekranı.
 * Kendi loading dosyası olmayan tüm route'lar bunu kullanır.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Sayfa yükleniyor"
      className="flex min-h-[70vh] flex-1 items-center justify-center"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-brand/10 text-brand">
          <Scissors className="size-6" />
        </span>
        <span className="text-sm text-muted-foreground">Yükleniyor…</span>
      </div>
    </div>
  );
}
