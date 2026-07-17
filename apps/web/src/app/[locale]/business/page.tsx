import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { WaveDivider } from '@/components/ui/WaveDivider';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Stat } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import { StepReserve } from '@/components/illustrations/StepReserve';
import { StepPickup } from '@/components/illustrations/StepPickup';
import { SurpriseBag } from '@/components/landing/SurpriseBag';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: `${t('business.hero.badge')} — ${t('business.hero.title')}`,
    description: t('business.hero.text'),
  };
}

/** Vitrine « Baraka Business » : recrute les commerçants partenaires. */
export default async function BusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main>
        <BusinessHero />
        <WaveDivider from="bg-cream" fill="text-cream-deep" />
        <Benefits />
        <WaveDivider from="bg-cream-deep" fill="text-pine" />
        <TermsBand />
        <WaveDivider from="bg-pine" fill="text-cream-deep" flip />
        <HowItWorksPro />
        <SurpriseBag />
        <WaveDivider from="bg-cream" fill="text-pine" />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

function BusinessHero() {
  const t = useTranslations('common');
  return (
    <section className="overflow-hidden">
      <Container className="py-14 text-center sm:py-20">
        <span className="rounded-full bg-yellow px-4 py-1.5 text-sm font-extrabold text-pine">
          {t('business.hero.badge')}
        </span>
        <h1 className="font-display mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight text-pine sm:text-6xl">
          {t('business.hero.title')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-black/70">{t('business.hero.text')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/register?next=/merchant" size="lg">
            {t('business.hero.ctaJoin')}
          </Button>
          <Button href="/merchant" variant="outline" size="lg">
            {t('business.hero.ctaSpace')}
          </Button>
        </div>
      </Container>
    </section>
  );
}

function Benefits() {
  const t = useTranslations('common');
  const items = ['revenue', 'customers', 'zeroRisk', 'impact'] as const;
  const icons: Record<(typeof items)[number], string> = {
    revenue: '💰',
    customers: '👋',
    zeroRisk: '🛡️',
    impact: '🌍',
  };
  return (
    <section className="bg-cream-deep py-20">
      <Container>
        <SectionTitle className="text-center">{t('business.benefits.title')}</SectionTitle>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((key) => (
            <Card key={key} className="text-center">
              <span aria-hidden className="text-4xl">
                {icons[key]}
              </span>
              <h3 className="font-display mt-3 text-lg font-extrabold text-pine">
                {t(`business.benefits.${key}.title`)}
              </h3>
              <p className="mt-2 text-black/60">{t(`business.benefits.${key}.text`)}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TermsBand() {
  const t = useTranslations('common');
  return (
    <section className="bg-pine py-16">
      <Container>
        <SectionTitle tone="cream" className="text-center">
          {t('business.band.title')}
        </SectionTitle>
        <div className="mt-10 grid gap-10 text-center sm:grid-cols-3">
          <Stat
            tone="band"
            value={t('business.band.fee.value')}
            label={t('business.band.fee.label')}
          />
          <Stat
            tone="band"
            value={t('business.band.commission.value')}
            label={t('business.band.commission.label')}
          />
          <Stat
            tone="band"
            value={t('business.band.control.value')}
            label={t('business.band.control.label')}
          />
        </div>
      </Container>
    </section>
  );
}

function HowItWorksPro() {
  const t = useTranslations('common');
  const steps = [
    { n: 1, Illo: StepReserve, key: 'step1' },
    { n: 2, Illo: StepPickup, key: 'step2' },
    { n: 3, Illo: null, key: 'step3' },
  ] as const;
  return (
    <section className="bg-cream-deep py-20">
      <Container>
        <SectionTitle className="text-center">{t('business.how.title')}</SectionTitle>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.n} className="text-center">
              {s.Illo ? (
                <s.Illo className="mx-auto h-28 w-28" />
              ) : (
                <CodeIllustration className="mx-auto h-28 w-28" />
              )}
              <div className="font-display mx-auto mt-3 flex size-8 items-center justify-center rounded-full bg-yellow font-extrabold text-pine">
                {s.n}
              </div>
              <h3 className="font-display mt-3 text-xl font-extrabold text-pine">
                {t(`business.how.${s.key}.title`)}
              </h3>
              <p className="mt-2 text-black/60">{t(`business.how.${s.key}.text`)}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}

/** Étape 3 — valider : borne affichant le code à 6 chiffres et une pastille validée. */
function CodeIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-hidden
      className={['h-auto w-full', className].filter(Boolean).join(' ')}
    >
      <circle cx="80" cy="78" r="64" className="fill-cream-deep" />
      {/* Borne / téléphone */}
      <rect x="48" y="32" width="64" height="92" rx="12" className="fill-white" />
      <rect
        x="48"
        y="32"
        width="64"
        height="92"
        rx="12"
        fill="none"
        className="stroke-pine"
        strokeWidth="4"
      />
      {/* Écran affichant le code */}
      <rect x="58" y="48" width="44" height="30" rx="5" className="fill-pine" />
      <text
        x="80"
        y="68"
        textAnchor="middle"
        fontFamily="monospace"
        fontSize="10"
        fontWeight="bold"
        letterSpacing="0.5"
        className="fill-cream"
      >
        482913
      </text>
      {/* Touches */}
      <circle cx="66" cy="98" r="4" className="fill-pine/15" />
      <circle cx="80" cy="98" r="4" className="fill-pine/15" />
      <circle cx="94" cy="98" r="4" className="fill-pine/15" />
      {/* Pastille validée */}
      <circle cx="104" cy="106" r="17" className="fill-pine" />
      <path
        d="M96 106l6 6 10-12"
        fill="none"
        className="stroke-yellow"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FinalCta() {
  const t = useTranslations('common');
  return (
    <section className="bg-pine py-20 text-center">
      <Container size="narrow">
        <SectionTitle tone="cream">{t('business.cta.title')}</SectionTitle>
        <p className="mx-auto mt-4 max-w-xl text-cream/80">{t('business.cta.text')}</p>
        <div className="mt-8 flex justify-center">
          <Button href="/register?next=/merchant" size="lg">
            {t('business.cta.button')}
          </Button>
        </div>
      </Container>
    </section>
  );
}
