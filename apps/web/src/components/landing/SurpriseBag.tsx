import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StepPickup } from '@/components/illustrations/StepPickup';

/** Section explicative « C'est quoi un Panier Surprise ». */
export function SurpriseBag() {
  const t = useTranslations('common');
  return (
    <section className="py-20">
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <div className="order-last lg:order-first">
          <StepPickup className="mx-auto max-w-sm" />
        </div>
        <div>
          <span className="inline-block rounded-full bg-yellow px-4 py-1 text-sm font-extrabold text-pine">
            {t('landing.bag.badge')}
          </span>
          <SectionTitle className="mt-4">{t('landing.bag.title')}</SectionTitle>
          <p className="mt-4 text-lg text-black/70">{t('landing.bag.text')}</p>
          <div className="mt-6">
            <Button href="/stores/boulangerie-el-baraka-tunis" variant="dark">
              {t('landing.bag.cta')}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
