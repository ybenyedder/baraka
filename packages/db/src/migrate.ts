/**
 * Runner de migration : active les extensions PostGIS/pg_trgm, crée la séquence de
 * numéros de commande, puis applique les migrations Drizzle.
 * Réutilisé par la CLI (`pnpm db:migrate`) et par l'entrypoint du conteneur API.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const url =
  process.env.DATABASE_URL ?? 'postgres://baraka:baraka_dev_password@localhost:5432/baraka';

function defaultMigrationsFolder(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
}

export async function runMigrations(opts: { migrationsFolder?: string } = {}): Promise<void> {
  const migrationsFolder =
    opts.migrationsFolder ?? process.env.MIGRATIONS_DIR ?? defaultMigrationsFolder();
  const sql = postgres(url, { max: 1 });
  try {
    console.log('→ Extensions PostGIS & pg_trgm…');
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

    console.log('→ Séquence des numéros de commande…');
    await sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`;

    console.log(`→ Migrations depuis ${migrationsFolder}…`);
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder });

    console.log('✓ Migrations appliquées.');
  } finally {
    await sql.end();
  }
}
