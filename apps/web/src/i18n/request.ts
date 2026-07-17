import { getRequestConfig } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import { getMessages } from '@baraka/i18n';
import type { Locale } from '@baraka/i18n/config';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (routing.locales as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : routing.defaultLocale;

  return { locale, messages: getMessages(locale) as unknown as AbstractIntlMessages };
});
