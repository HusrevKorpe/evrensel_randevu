/**
 * Instagram ikonu.
 * Bu lucide-react sürümü marka (sosyal) ikonlarını içermediği için,
 * standart Instagram glyph'ini inline SVG olarak veriyoruz.
 * `currentColor` kullanır → metin rengi sınıfları (text-brand vb.) çalışır.
 * Boyut `className` ile verilir (ör. "size-4").
 */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
