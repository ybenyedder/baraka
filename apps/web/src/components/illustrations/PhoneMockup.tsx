/** Maquette de téléphone montrant une liste de paniers — section application. */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 400"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      {/* Châssis */}
      <rect x="30" y="14" width="200" height="372" rx="34" className="fill-pine" />
      {/* Écran */}
      <rect x="44" y="40" width="172" height="320" rx="20" className="fill-cream" />
      {/* Encoche */}
      <rect x="104" y="24" width="52" height="10" rx="5" className="fill-cream/30" />
      {/* En-tête */}
      <rect x="60" y="58" width="90" height="14" rx="7" className="fill-pine/70" />
      <circle cx="196" cy="66" r="10" className="fill-yellow" />

      {/* Cartes de paniers */}
      <g>
        <rect x="60" y="92" width="140" height="76" rx="14" className="fill-white" />
        <rect x="72" y="104" width="40" height="40" rx="10" className="fill-cream-deep" />
        <rect x="122" y="108" width="60" height="9" rx="4.5" className="fill-pine/25" />
        <rect x="122" y="124" width="42" height="8" rx="4" className="fill-pine/15" />
        <rect x="122" y="144" width="46" height="16" rx="8" className="fill-yellow" />
      </g>
      <g>
        <rect x="60" y="180" width="140" height="76" rx="14" className="fill-white" />
        <rect x="72" y="192" width="40" height="40" rx="10" className="fill-cream-deep" />
        <rect x="122" y="196" width="60" height="9" rx="4.5" className="fill-pine/25" />
        <rect x="122" y="212" width="42" height="8" rx="4" className="fill-pine/15" />
        <rect x="122" y="232" width="46" height="16" rx="8" className="fill-yellow" />
      </g>
      <g>
        <rect x="60" y="268" width="140" height="76" rx="14" className="fill-white" />
        <rect x="72" y="280" width="40" height="40" rx="10" className="fill-cream-deep" />
        <rect x="122" y="284" width="60" height="9" rx="4.5" className="fill-pine/25" />
        <rect x="122" y="300" width="42" height="8" rx="4" className="fill-pine/15" />
        <rect x="122" y="320" width="46" height="16" rx="8" className="fill-yellow" />
      </g>
    </svg>
  );
}
