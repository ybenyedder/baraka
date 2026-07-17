/**
 * Séparateur en vague entre deux sections.
 * `from` = fond de la section au-dessus (ex. 'bg-cream'), `fill` = couleur de la
 * section en dessous (ex. 'text-pine', via fill-current). Le tracé remplit le bas :
 * au-dessus de la crête on voit `from`, en dessous `fill` — transition nette.
 */
export function WaveDivider({
  from,
  fill,
  flip,
  className,
}: {
  from?: string;
  fill?: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={[from, className].filter(Boolean).join(' ')}>
      <svg
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        className={['block h-8 w-full fill-current sm:h-12', fill, flip ? '-scale-x-100' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <path d="M0,40 C220,8 480,64 720,40 C960,16 1200,60 1440,32 L1440,70 L0,70 Z" />
      </svg>
    </div>
  );
}
