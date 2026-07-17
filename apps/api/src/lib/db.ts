import { createDb, type Database } from '@baraka/db';
import { env } from '../config/env';

let handle: ReturnType<typeof createDb> | null = null;

/** Connexion base partagée (singleton par process). */
export function getDb(): Database {
  if (!handle) handle = createDb(env.DATABASE_URL);
  return handle.db;
}

/** Client postgres.js brut (pour le SQL PostGIS non couvert par Drizzle). */
export function getSql() {
  if (!handle) handle = createDb(env.DATABASE_URL);
  return handle.client;
}

export async function closeDb(): Promise<void> {
  if (handle) {
    await handle.client.end();
    handle = null;
  }
}
