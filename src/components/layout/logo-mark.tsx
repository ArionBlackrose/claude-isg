/** Kurumsal, sade göz amblemi — "izleme/takip" fikrini simgeler. Simetrik
 * badem şekli + iris halkası + bebek (pupil), klasik güvenlik/izleme
 * ikonografisine yakın, tek renkli ve her boyutta net okunur bir çizim.
 * `currentColor` kullanır, böylece tema (koyu/açık) değiştiğinde ayrı bir
 * varlık yönetmeye gerek kalmaz. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M6 50 Q50 12 94 50 Q50 88 6 50 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
      />
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="7" />
      <circle cx="50" cy="50" r="8" fill="currentColor" />
    </svg>
  );
}
