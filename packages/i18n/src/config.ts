import { LOCALES, DEFAULT_LOCALE, RTL_LOCALES, type Locale } from '@baraka/shared';

export { LOCALES, DEFAULT_LOCALE, RTL_LOCALES };
export type { Locale };

export type Direction = 'ltr' | 'rtl';

/** Vrai si la locale s'écrit de droite à gauche. */
export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Direction d'écriture d'une locale. */
export function getDirection(locale: Locale): Direction {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/** Étiquettes natives des langues (pour le sélecteur). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

/** Locale BCP-47 complète pour Intl (formatage nombres/dates). */
export const LOCALE_BCP47: Record<Locale, string> = {
  fr: 'fr-TN',
  en: 'en-US',
  ar: 'ar-TN',
};

/** Résout une locale arbitraire (ex : depuis Accept-Language) vers une locale supportée. */
export function resolveLocale(input: string | undefined | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.toLowerCase().split(/[-_]/)[0];
  return (LOCALES as readonly string[]).includes(base ?? '') ? (base as Locale) : DEFAULT_LOCALE;
}
