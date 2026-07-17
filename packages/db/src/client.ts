import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export type Schema = typeof schema;

export interface DbHandle {
  db: ReturnType<typeof drizzle<Schema>>;
  client: ReturnType<typeof postgres>;
}

/** Crée une connexion Drizzle + le client postgres.js sous-jacent. */
export function createDb(connectionString = process.env.DATABASE_URL): DbHandle {
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant : impossible de créer la connexion base de données.');
  }
  const client = postgres(connectionString, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    // Le Pi est mono-instance ; on garde un pool modeste.
  });
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = DbHandle['db'];
export { schema };
