import base from '@baraka/config/eslint/base';

/**
 * Lint de l'API (Fastify, Node). Étend la config partagée.
 * Les entrypoints CLI/worker écrivent légitimement sur stdout → `no-console` désactivé pour eux.
 */
export default [
  ...base,
  {
    files: ['src/worker.ts', 'src/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];
