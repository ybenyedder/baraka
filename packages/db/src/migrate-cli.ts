/** CLI de migration (`pnpm db:migrate`). Le module migrate.ts reste pur (importable). */
import { runMigrations } from './migrate';

runMigrations().catch((err) => {
  console.error('✗ Échec des migrations :', err);
  process.exit(1);
});
