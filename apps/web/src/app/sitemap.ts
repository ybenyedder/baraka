import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const BASE = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://baraka.tn';

/** Sitemap multilingue des pages publiques (les pages boutiques s’ajouteront dynamiquement). */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/business', '/legal/privacy', '/legal/terms', '/legal/delete-account'];
  return routing.locales.flatMap((locale) =>
    paths.map((p) => ({
      url: `${BASE}/${locale}${p}`,
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : p === '/business' ? 0.8 : 0.5,
    })),
  );
}
