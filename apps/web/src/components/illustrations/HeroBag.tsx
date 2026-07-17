/** Panier surprise dans un blob — illustration principale du hero. */
export function HeroBag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 380"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      {/* Blob de fond */}
      <circle cx="200" cy="192" r="158" className="fill-cream-deep" />

      {/* Étincelles */}
      <circle cx="62" cy="120" r="9" className="fill-yellow" />
      <circle cx="338" cy="96" r="11" className="fill-pine/15" />
      <circle cx="348" cy="256" r="7" className="fill-yellow" />
      <circle cx="70" cy="270" r="6" className="fill-pine/15" />

      {/* Feuilles qui dépassent */}
      <path d="M150 168c-16-28-8-58 6-72 8 26 4 52-6 72Z" className="fill-pine" />
      <path d="M176 166c-4-34 12-58 30-68-4 30-16 52-30 68Z" className="fill-pine/80" />

      {/* Baguette */}
      <g transform="rotate(26 236 130)">
        <rect x="222" y="86" width="28" height="92" rx="14" className="fill-white" />
        <rect
          x="222"
          y="86"
          width="28"
          height="92"
          rx="14"
          fill="none"
          className="stroke-pine"
          strokeWidth="3"
        />
        <path
          d="M232 104l6 8M232 122l6 8M232 140l6 8"
          className="stroke-pine"
          strokeWidth="2.4"
          fill="none"
        />
      </g>

      {/* Petit pain rond */}
      <circle cx="150" cy="196" r="22" className="fill-pine" />

      {/* Corps du sac */}
      <path
        d="M112 190h176l13 150a18 18 0 0 1-18 20H117a18 18 0 0 1-18-20Z"
        className="fill-yellow"
      />
      <path
        d="M112 190h176l13 150a18 18 0 0 1-18 20H117a18 18 0 0 1-18-20Z"
        fill="none"
        className="stroke-pine"
        strokeWidth="4"
      />
      {/* Pli du sac */}
      <path d="M104 190h192l3 34H101Z" className="fill-yellow" />
      <path
        d="M104 190h192l3 34H101Z"
        fill="none"
        className="stroke-pine"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Coutures verticales */}
      <path
        d="M160 236v96M240 236v96"
        className="stroke-pine/30"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
