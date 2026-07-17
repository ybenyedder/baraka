import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/SectionTitle';

/** Appel à l'action commerçants sur fond pine. */
export function MerchantCta() {
  const t = useTranslations('common');
  return (
    <section id="merchants" className="scroll-mt-24 bg-pine py-20 text-center">
      <Container size="narrow">
        <SectionTitle tone="cream">{t('landing.merchant.title')}</SectionTitle>
        <p className="mx-auto mt-4 max-w-xl text-cream/80">{t('landing.merchant.text')}</p>
        <div className="mt-8 flex justify-center">
          <Button href="/business" size="lg">
            {t('landing.merchant.cta')}
          </Button>
        </div>
      </Container>
    </section>
  );
}
