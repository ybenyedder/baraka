/* eslint-disable import/no-named-as-default-member --
   i18next expose `use`/`changeLanguage`/`init` à la fois en exports nommés ET en
   méthodes de l'instance par défaut ; l'accès par membre (`i18n.use(...)`) est le pattern officiel. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import { getLocales } from 'expo-localization';
import { resources, DEFAULT_LOCALE, LOCALES, type Locale } from '@baraka/i18n';

/** Détecte la locale de l'appareil, repliée sur une locale supportée. */
export function detectDeviceLocale(): Locale {
  const device = getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  return (LOCALES as readonly string[]).includes(device) ? (device as Locale) : DEFAULT_LOCALE;
}

export async function initI18n(locale: Locale): Promise<void> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(locale);
    return;
  }
  await i18n
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources: resources as unknown as Record<string, Record<string, object>>,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      ns: ['common', 'auth', 'discovery', 'orders', 'merchant'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
    });
}

export { i18n };
