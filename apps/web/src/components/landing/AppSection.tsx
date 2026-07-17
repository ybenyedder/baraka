import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { PhoneMockup } from '@/components/illustrations/PhoneMockup';

/** Section application mobile (maquette + badges de stores neutres). */
export function AppSection() {
  const t = useTranslations('common');
  return (
    <section className="bg-cream-deep py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-[220px]">
          <PhoneMockup />
        </div>
        <div>
          <SectionTitle>{t('landing.app.title')}</SectionTitle>
          <p className="mt-4 text-lg text-black/70">{t('landing.app.text')}</p>
          <p className="mt-6 text-sm font-bold text-black/50">{t('landing.app.soon')}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="rounded-full bg-pine px-5 py-2 text-sm font-bold text-cream">
              App Store
            </span>
            <span className="rounded-full bg-pine px-5 py-2 text-sm font-bold text-cream">
              Google Play
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
