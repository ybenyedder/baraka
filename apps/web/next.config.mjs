import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Le lint tourne dans une étape CI dédiée (`pnpm lint`, flat config ESLint 9, bloquante),
  // pas au build → évite un double passage et l'intégration eslint interne de Next.
  eslint: { ignoreDuringBuilds: true },
  // Les packages workspace sont du TS brut → transpilés par Next.
  transpilePackages: ['@baraka/i18n', '@baraka/shared'],
  experimental: {
    // Autorise l'import de fichiers hors du répertoire de l'app (monorepo).
    externalDir: true,
  },
  // App mono-origine : en production, Caddy route /v1/* et /u/* directement vers
  // le conteneur API (voir Caddyfile). En développement, Next proxifie ces chemins
  // vers l'API locale. On n'utilise PAS de proxy Next en prod car les rewrites sont
  // évaluées au build (output: standalone) et ne relisent pas les variables d'env
  // au runtime — ce qui rendait l'inscription en 500 (proxy vers 3003 inexistant).
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    const api = process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001';
    return [
      { source: '/v1/:path*', destination: `${api}/v1/:path*` },
      { source: '/u/:path*', destination: `${api}/u/:path*` },
      { source: '/healthz', destination: `${api}/healthz` },
    ];
  },
  // En-têtes de sécurité appliqués à toutes les routes. Empêche l'embarquement
  // en iframe (clickjacking), le MIME sniffing et impose HTTPS.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
