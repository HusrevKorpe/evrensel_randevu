/**
 * Panel sayfaları veri çekerken gösterilen iskelet — boş beyaz ekran yerine
 * "bir şeyler geliyor" hissi verir.
 */
export default function PanelLoading() {
  return (
    <div aria-label="Yükleniyor" role="status" className="space-y-4 p-1">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
