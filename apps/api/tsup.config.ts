import { defineConfig } from 'tsup';

/**
 * Bundle l'API pour la production : les packages workspace @baraka/* (sources TS)
 * sont INLINÉS dans le bundle, les dépendances node_modules restent externes.
 * → `node dist/server.js` tourne sans les sources TS des packages.
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts', 'src/scripts/migrate.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [/^@baraka\//],
});
