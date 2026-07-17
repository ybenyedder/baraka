/** Logo Baraka : couffin/panier jaune + wordmark. `tone` colore le trait et le texte. */
export function Logo({
  tone = 'pine',
  withWordmark = true,
  className,
}: {
  tone?: 'pine' | 'cream';
  withWordmark?: boolean;
  className?: string;
}) {
  const color = tone === 'cream' ? 'text-cream' : 'text-pine';
  const bagBody = 'M6.5 11.5h19l1.4 14.2a2.4 2.4 0 0 1-2.4 2.6H7.5a2.4 2.4 0 0 1-2.4-2.6z';
  return (
    <span
      className={['inline-flex items-center gap-2', color, className].filter(Boolean).join(' ')}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <path d={bagBody} className="fill-yellow" />
        <path
          d="M11 12v-1.5a5 5 0 0 1 10 0V12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path d={bagBody} fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {withWordmark ? (
        <span className="font-display text-xl font-extrabold leading-none">Baraka</span>
      ) : null}
    </span>
  );
}
