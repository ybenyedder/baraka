/** Étape 3 — récupérer : devanture de commerce et panier à emporter. */
export function StepPickup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      <circle cx="80" cy="78" r="64" className="fill-cream-deep" />
      {/* Boutique */}
      <rect x="40" y="58" width="80" height="66" rx="6" className="fill-white" />
      <rect
        x="40"
        y="58"
        width="80"
        height="66"
        rx="6"
        fill="none"
        className="stroke-pine"
        strokeWidth="4"
      />
      {/* Store / auvent */}
      <path d="M36 58h88l-6-18H42Z" className="fill-pine" />
      <path
        d="M52 40l-4 18M68 40l-2 18M84 40l2 18M100 40l4 18"
        className="stroke-yellow"
        strokeWidth="3"
      />
      {/* Porte */}
      <rect x="88" y="86" width="24" height="38" rx="3" className="fill-pine/15" />
      {/* Sac à emporter */}
      <path d="M50 96h26l2 24a5 5 0 0 1-5 5H53a5 5 0 0 1-5-5Z" className="fill-yellow" />
      <path
        d="M50 96h26l2 24a5 5 0 0 1-5 5H53a5 5 0 0 1-5-5Z"
        fill="none"
        className="stroke-pine"
        strokeWidth="3.4"
      />
      <path
        d="M56 96v-2a7 7 0 0 1 14 0v2"
        fill="none"
        className="stroke-pine"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
