/** Entrypoint de migration du conteneur (bundlé avec @baraka/db). */
import { runMigrations } from '@baraka/db';

await runMigrations({ migrationsFolder: process.env.MIGRATIONS_DIR });
process.exit(0);
