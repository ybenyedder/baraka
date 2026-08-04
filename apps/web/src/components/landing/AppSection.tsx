import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { PhoneMockup } from '@/components/illustrations/PhoneMockup';
import { DownloadAppButton } from '@/components/DownloadAppButton';

/** Section application mobile (maquette + téléchargement Android via GitHub Releases). */
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
          <p className="mt-6 text-sm font-bold text-black/50">{t('landing.app.downloadHint')}</p>
          <div className="mt-3">
            <DownloadAppButton />
          </div>
        </div>
      </Container>
    </section>
  );
}
