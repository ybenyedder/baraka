import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@baraka/i18n/config';
import { fetchStoreDetail } from '@/lib/api';
import { demoStoreDetail } from '@/lib/demoStore';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReserveBags } from '@/components/ReserveBags';
import { foodPhoto } from '@/lib/photos';

interface StorePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchStoreDetail(slug);
  const name = store?.name ?? slugToName(slug);
  return {
    title: `${name} — Baraka`,
    description:
      store?.description ?? `Réserve les paniers surprise d’invendus de ${name} sur Baraka.`,
    openGraph: {
      title: name,
      type: 'website',
      images: store?.coverImageUrl ? [store.coverImageUrl] : undefined,
    },
  };
}

/** Page boutique SSR (surface SEO) alimentée par l'API, avec JSON-LD LocalBusiness. */
/** Détail boutique : API réelle si dispo, sinon démo en dev (API non connectée en local). */
async function loadStore(slug: string) {
  const store = await fetchStoreDetail(slug);
  if (store) return store;
  return process.env.NODE_ENV === 'production' ? null : demoStoreDetail(slug);
}

export default async function StorePage({ params }: StorePageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('discovery');
  const store = await loadStore(slug);
  const name = store?.name ?? slugToName(slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store?.addressLine,
      addressLocality: store?.city ?? 'Tunis',
      addressCountry: 'TN',
    },
    aggregateRating:
      store && store.ratingCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: store.ratingAvg,
            reviewCount: store.ratingCount,
          }
        : undefined,
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 h-44 overflow-hidden rounded-2xl bg-cream-deep sm:h-52">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={store?.coverImageUrl ?? foodPhoto(store?.category, slug)}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-pine sm:text-3xl">{name}</h1>
          <p className="mt-2 text-black/60">
            {store ? `${store.addressLine}, ${store.city}` : 'Tunis, Tunisie'}
          </p>
          {store?.description ? <p className="mt-4 text-black/70">{store.description}</p> : null}

          <h2 className="mb-3 mt-8 font-display text-lg font-extrabold text-pine">{t('title')}</h2>
          <ReserveBags bags={store?.liveBags ?? []} slug={slug} locale={locale as Locale} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Sérialise du JSON-LD en neutralisant `</script>` et les séparateurs de ligne (anti-XSS). */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
