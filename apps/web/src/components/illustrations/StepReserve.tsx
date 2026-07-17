/** Étape 2 — réserver : téléphone avec un panier et une pastille validée. */
export function StepReserve({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      <circle cx="80" cy="78" r="64" className="fill-cream-deep" />
      {/* Téléphone */}
      <rect x="54" y="30" width="52" height="96" rx="12" className="fill-white" />
      <rect
        x="54"
        y="30"
        width="52"
        height="96"
        rx="12"
        fill="none"
        className="stroke-pine"
        strokeWidth="4"
      />
      {/* Sac à l'écran */}
      <path d="M66 66h28l2 26a5 5 0 0 1-5 5H69a5 5 0 0 1-5-5Z" className="fill-yellow" />
      <path
        d="M72 66v-3a8 8 0 0 1 16 0v3"
        fill="none"
        className="stroke-pine"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Pastille validée */}
      <circle cx="104" cy="104" r="18" className="fill-pine" />
      <path
        d="M96 104l6 6 10-12"
        fill="none"
        className="stroke-yellow"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
