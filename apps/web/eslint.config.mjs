import react from '@baraka/config/eslint/react';
import next from '@next/eslint-plugin-next';

/**
 * Lint du web (Next.js 15, React). Étend la config React partagée (flat, ESLint 9)
 * et ajoute les règles Next.js (recommended + core-web-vitals).
 */
export default [
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
  ...react,
  {
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
];
