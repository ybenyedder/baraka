import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Container } from '@/components/ui/Container';

export default async function Terms({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal.terms');
  return (
    <>
      <SiteHeader />
      <main className="py-12">
        <Container size="narrow" className="text-black/80">
          <h1 className="font-display text-4xl font-extrabold text-pine">{t('title')}</h1>
          <p className="mt-4">{t('intro')}</p>
          <h2 className="mt-8 font-display text-xl font-extrabold text-pine">
            {t('reservationsHeading')}
          </h2>
          <p className="mt-2">{t('reservationsBody')}</p>
          <h2 className="mt-8 font-display text-xl font-extrabold text-pine">
            {t('paymentHeading')}
          </h2>
          <p className="mt-2">{t('paymentBody')}</p>
          <h2 className="mt-8 font-display text-xl font-extrabold text-pine">
            {t('liabilityHeading')}
          </h2>
          <p className="mt-2">{t('liabilityBody')}</p>
          <p className="mt-8 text-sm text-black/40">{t('lastUpdated')}</p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
