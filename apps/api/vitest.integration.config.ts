import { defineConfig } from 'vitest/config';

/**
 * Tests d'INTÉGRATION (chemins argent / autorisation / concurrence) contre une vraie base
 * PostGIS. Séparés des tests unitaires (`vitest.config.ts`, `*.test.ts`) qui, eux, tournent
 * partout sans base (dont la CI). On ne les inclut donc PAS dans `pnpm test`.
 *
 * Pré-requis : une base `baraka_test` migrée, joignable via TEST_DATABASE_URL (défaut : la
 * PostGIS de dev sur le port 5433). Lancement : `pnpm --filter @baraka/api test:integration`.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://baraka:baraka_dev_password@localhost:5433/baraka_test';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.itest.ts'],
    // Les tests partagent la base : ils s'isolent par TRUNCATE dans un beforeEach et ne
    // doivent donc pas tourner en parallèle sur le même process.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: 'integration_tests_secret_at_least_16_chars',
      PAYMENT_PROVIDERS: 'cash',
      // Pool volontairement > 1 pour que les transactions concurrentes s'exécutent en
      // parallèle (indispensable pour tester le verrou anti double-dépense).
      DB_POOL_MAX: '10',
    },
  },
});
