import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getDirection, type Locale } from '@baraka/i18n/config';
import { routing } from '@/i18n/routing';
import { baloo, balooArabic, nunito } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Baraka — sauve un panier, sauve la baraka',
  description:
    'Marketplace anti-gaspillage : réserve les paniers surprise d’invendus près de chez toi.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = getDirection(locale as Locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${baloo.variable} ${nunito.variable} ${balooArabic.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
