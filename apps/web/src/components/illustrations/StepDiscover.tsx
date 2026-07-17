/** Étape 1 — découvrir : loupe sur une épingle de carte. */
export function StepDiscover({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      <circle cx="80" cy="78" r="64" className="fill-cream-deep" />
      {/* Épingle */}
      <path
        d="M78 52c18 0 32 14 32 32 0 24-32 46-32 46S46 108 46 84c0-18 14-32 32-32Z"
        className="fill-pine"
      />
      <circle cx="78" cy="84" r="12" className="fill-yellow" />
      {/* Loupe */}
      <circle cx="104" cy="60" r="22" className="fill-white/70" />
      <circle cx="104" cy="60" r="22" fill="none" className="stroke-pine" strokeWidth="5" />
      <path d="M120 76l16 16" className="stroke-pine" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
