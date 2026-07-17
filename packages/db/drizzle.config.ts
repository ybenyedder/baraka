import { defineConfig } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ?? 'postgres://baraka:baraka_dev_password@localhost:5432/baraka';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  // PostGIS ajoute des types/tables système qu'on ne veut pas gérer.
  extensionsFilters: ['postgis'],
  verbose: true,
  strict: true,
});
