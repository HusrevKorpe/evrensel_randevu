"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Geçmiş randevular listesinin sayfa gezinmesi. Sayfa numarası URL'de
 * (?page=) tutulur → server component onu okuyup ilgili dilimi çeker.
 * (Randevu listesindeki filtre deseninin aynısı.)
 */
export function HistoryPagination({
  page,
  lastPage,
}: {
  page: number;
  lastPage: number;
}) {
  const router = useRouter();

  if (lastPage <= 1) return null;

  function go(next: number) {
    router.push(next <= 1 ? "/admin/gecmis" : `/admin/gecmis?page=${next}`);
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        aria-label="Önceki sayfa (daha yeni)"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <ChevronLeft />
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        Sayfa {page} / {lastPage}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Sonraki sayfa (daha eski)"
        disabled={page >= lastPage}
        onClick={() => go(page + 1)}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
