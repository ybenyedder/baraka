import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchNearbyBags } from '@/lib/api';
import type { Locale } from '@baraka/i18n/config';
import { Link } from '@/i18n/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Container } from '@/components/ui/Container';
import { BagCard } from '@/components/BagCard';

export const metadata: Metadata = {
  title: 'Trouver un panier — Baraka',
  description: 'Parcours les paniers surprise d’invendus près de chez toi et réserve le tien.',
};

// Centre de Tunis par défaut (démo) ; la géolocalisation pourra affiner plus tard.
const DEFAULT_LAT = 36.8065;
const DEFAULT_LNG = 10.1815;

const FILTERS = ['all', 'bakery_pastry', 'meals', 'groceries', 'cafe', 'hotel_buffet'] as const;

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('common');

  const category = sp.category;
  const q = sp.q?.trim() || undefined;
  const bags = await fetchNearbyBags({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    radius: 30000,
    category,
    q,
    limit: 50,
  });

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-cream-deep py-10">
          <Container>
            <h1 className="font-display text-3xl font-extrabold text-pine sm:text-4xl">
              {t('browse.title')}
            </h1>
            <p className="mt-2 text-black/60">{t('browse.subtitle')}</p>

            <form className="mt-6 flex max-w-xl gap-2">
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder={t('browse.searchPlaceholder')}
                className="w-full rounded-full border border-pine/15 bg-white px-5 py-3 focus:border-pine focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-pine px-6 py-3 font-bold text-cream transition hover:bg-pine/90"
              >
                {t('browse.search')}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const active = f === 'all' ? !category : category === f;
                const href = f === 'all' ? '/browse' : `/browse?category=${f}`;
                return (
                  <Link
                    key={f}
                    href={href}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      active ? 'bg-pine text-cream' : 'bg-white text-pine hover:bg-pine/5'
                    }`}
                  >
                    {t(`browse.filters.${f}`)}
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>

        <Container className="py-10">
          {bags.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-pine/20 bg-white p-12 text-center text-black/50">
              {t('browse.empty')}
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm font-semibold text-black/50">
                {t('browse.count', { count: bags.length })}
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {bags.map((bag) => (
                  <BagCard
                    key={bag.bagInstanceId}
                    bag={bag}
                    locale={locale as Locale}
                    todayLabel={t('browse.today')}
                    leftLabel={t('browse.left', { count: bag.quantityAvailable })}
                  />
                ))}
              </div>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
