import type { ReactNode } from 'react';

/** Titre de section (police display). */
export function SectionTitle({
  children,
  className,
  tone = 'pine',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'pine' | 'cream';
}) {
  const color = tone === 'cream' ? 'text-cream' : 'text-pine';
  return (
    <h2
      className={[
        'font-display text-3xl font-extrabold leading-tight sm:text-4xl',
        color,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </h2>
  );
}
