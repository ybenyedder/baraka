import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://baraka.tn';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Les routes sont préfixées par la locale (/fr/admin…) : couvrir les deux formes.
        disallow: ['/merchant', '/admin', '/*/merchant', '/*/admin'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
