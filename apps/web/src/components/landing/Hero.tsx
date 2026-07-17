import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { HeroBag } from '@/components/illustrations/HeroBag';

/** Section héro : titre, sous-titre, CTA et illustration du panier. */
export function Hero() {
  const t = useTranslations('common');
  return (
    <section className="overflow-hidden">
      <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-pine sm:text-6xl">
            {t('tagline')}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-black/70">{t('landing.hero.subtitle')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/browse" size="lg">
              {t('landing.hero.ctaFind')}
            </Button>
            <Button href="/business" variant="outline" size="lg">
              {t('landing.hero.ctaPartner')}
            </Button>
          </div>
        </div>
        <HeroBag className="mx-auto max-w-md" />
      </Container>
    </section>
  );
}
