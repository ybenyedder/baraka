import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StepDiscover } from '@/components/illustrations/StepDiscover';
import { StepReserve } from '@/components/illustrations/StepReserve';
import { StepPickup } from '@/components/illustrations/StepPickup';

/** « Comment ça marche » : trois cartes numérotées avec illustrations. */
export function HowItWorks() {
  const t = useTranslations('common');
  const steps = [
    {
      n: 1,
      Illo: StepDiscover,
      title: t('landing.how.step1.title'),
      text: t('landing.how.step1.text'),
    },
    {
      n: 2,
      Illo: StepReserve,
      title: t('landing.how.step2.title'),
      text: t('landing.how.step2.text'),
    },
    {
      n: 3,
      Illo: StepPickup,
      title: t('landing.how.step3.title'),
      text: t('landing.how.step3.text'),
    },
  ];
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-cream-deep py-20">
      <Container>
        <SectionTitle className="text-center">{t('landing.how.title')}</SectionTitle>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n} className="text-center">
              <s.Illo className="mx-auto h-28 w-28" />
              <div className="mx-auto mt-3 flex size-8 items-center justify-center rounded-full bg-yellow font-display font-extrabold text-pine">
                {s.n}
              </div>
              <h3 className="mt-3 font-display text-xl font-extrabold text-pine">{s.title}</h3>
              <p className="mt-2 text-black/60">{s.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
