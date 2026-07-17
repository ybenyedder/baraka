import type { ReactNode } from 'react';

/** Carte blanche arrondie. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['rounded-3xl bg-white p-6 shadow-sm', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
