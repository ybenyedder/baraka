import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Container } from '@/components/ui/Container';

/** Page publique de suppression de compte (exigée par Apple/Google). */
export default async function DeleteAccount({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal.deleteAccount');
  return (
    <>
      <SiteHeader />
      <main className="py-12">
        <Container size="narrow" className="text-black/80">
          <h1 className="font-display text-4xl font-extrabold text-pine">{t('title')}</h1>
          <p className="mt-4">{t('intro')}</p>
          <h2 className="mt-8 font-display text-xl font-extrabold text-pine">
            {t('inAppHeading')}
          </h2>
          <ol className="mt-2 list-decimal space-y-1 ps-6">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
          </ol>
          <p className="mt-6">{t('afterBody')}</p>
          <h2 className="mt-8 font-display text-xl font-extrabold text-pine">
            {t('withoutAppHeading')}
          </h2>
          <p className="mt-2">{t('withoutAppBody')}</p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
