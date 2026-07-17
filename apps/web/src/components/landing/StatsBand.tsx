import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Stat } from '@/components/ui/Stat';

/** Bande de statistiques sur fond pine. */
export function StatsBand() {
  const t = useTranslations('common');
  return (
    <section className="bg-pine py-16">
      <Container>
        <SectionTitle tone="cream" className="text-center">
          {t('landing.stats.title')}
        </SectionTitle>
        <div className="mt-10 grid gap-10 text-center sm:grid-cols-3">
          <Stat
            tone="band"
            value={t('landing.stats.bags.value')}
            label={t('landing.stats.bags.label')}
          />
          <Stat
            tone="band"
            value={t('landing.stats.co2.value')}
            label={t('landing.stats.co2.label')}
          />
          <Stat
            tone="band"
            value={t('landing.stats.stores.value')}
            label={t('landing.stats.stores.label')}
          />
        </div>
      </Container>
    </section>
  );
}
