/**
 * Post-traitement des migrations Drizzle : dé-quote les types PostGIS.
 *
 * Drizzle traite `geography(Point,4326)` comme un identifiant et l'entoure de
 * guillemets doubles dans le DDL généré → `"geography(Point,4326)"`, que Postgres
 * refuse (« type inexistant »). On retire ces guillemets sur toutes les migrations.
 * Exécuté automatiquement après `drizzle-kit generate`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const QUOTED_GEO = /"(geography|geometry)\(([^"]*)\)"/g;

let fixedFiles = 0;
for (const file of readdirSync(migrationsDir)) {
  if (!file.endsWith('.sql')) continue;
  const path = join(migrationsDir, file);
  const original = readFileSync(path, 'utf8');
  const fixed = original.replace(QUOTED_GEO, '$1($2)');
  if (fixed !== original) {
    writeFileSync(path, fixed);
    fixedFiles += 1;
    // eslint-disable-next-line no-console
    console.log(`  ✓ types PostGIS dé-quotés dans ${file}`);
  }
}
if (fixedFiles === 0) {
  // eslint-disable-next-line no-console
  console.log('  (aucun type PostGIS à corriger)');
}
