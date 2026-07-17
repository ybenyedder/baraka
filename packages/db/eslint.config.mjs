import base from '@baraka/config/eslint/base';

/**
 * Lint du package DB (Drizzle, Node). Étend la config partagée.
 * Les scripts CLI (seed, migrations) écrivent légitimement sur stdout → `no-console` désactivé pour eux.
 */
export default [
  ...base,
  {
    files: ['src/seed.ts', 'src/migrate.ts', 'src/migrate-cli.ts'],
    rules: { 'no-console': 'off' },
  },
];
