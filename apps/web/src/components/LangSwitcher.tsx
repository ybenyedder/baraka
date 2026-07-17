'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALES, LOCALE_LABELS, type Locale } from '@baraka/i18n/config';

/**
 * Sélecteur de langue maison (pas un <select> natif : sa flèche et sa liste
 * déroulante sont rendues par l'OS et détonnent avec le header). Menu accessible
 * au clavier, fermé au clic extérieur / Échap, aligné correctement en RTL.
 */
export function LangSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Ferme au clic hors du composant.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function choose(l: Locale) {
    setOpen(false);
    if (l !== locale) router.replace(pathname, { locale: l });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={LOCALE_LABELS[locale]}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-white px-3 py-2 text-sm font-semibold text-pine transition hover:border-pine/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        <GlobeIcon />
        <span>{LOCALE_LABELS[locale]}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 min-w-[9rem] overflow-hidden rounded-2xl border border-pine/10 bg-white p-1 shadow-lg"
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                role="menuitem"
                type="button"
                lang={l}
                dir={l === 'ar' ? 'rtl' : 'ltr'}
                onClick={() => choose(l)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition ${
                  active ? 'bg-pine/5 text-pine' : 'text-pine/80 hover:bg-pine/5 hover:text-pine'
                }`}
              >
                <span>{LOCALE_LABELS[l]}</span>
                {active ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}
