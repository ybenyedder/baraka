import { useTranslation } from 'react-i18next';
import { LOCALE_BCP47, LOCALES, DEFAULT_LOCALE, type Locale } from '@baraka/i18n';

/** Locale courante résolue + BCP-47 pour Intl + drapeau arabe (RTL). */
export function useLocale(): { locale: Locale; bcp47: string; isArabic: boolean } {
  const { i18n } = useTranslation();
  const raw = i18n.language;
  const locale = (LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : DEFAULT_LOCALE;
  return { locale, bcp47: LOCALE_BCP47[locale], isArabic: locale === 'ar' };
}
