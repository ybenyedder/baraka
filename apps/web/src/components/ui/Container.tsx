import type { ReactNode } from 'react';

/** Conteneur centré à largeur maximale. */
export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow';
}) {
  const max = size === 'narrow' ? 'max-w-3xl' : 'max-w-6xl';
  return (
    <div className={['mx-auto w-full px-6', max, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
