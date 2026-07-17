// Accès haut niveau : createDb + le namespace `schema`.
export * from './client';
// Runner de migration réutilisable (CLI + conteneur API).
export { runMigrations } from './migrate';
// Accès direct aux tables (import { users, stores, orders } from '@baraka/db').
export * from './schema/index';
