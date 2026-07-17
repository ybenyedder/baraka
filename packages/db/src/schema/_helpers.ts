import { customType, timestamp } from 'drizzle-orm/pg-core';

/**
 * Colonne PostGIS `geography(Point, 4326)`.
 * Écriture via WKT EWKT ; lecture brute (les requêtes de proximité passent par du SQL
 * `ST_X/ST_Y/ST_Distance` explicite, on ne s'appuie pas sur fromDriver pour le décodage géo).
 */
export const geographyPoint = customType<{
  data: { lat: number; lng: number };
  driverData: string;
}>({
  dataType() {
    return 'geography(Point,4326)';
  },
  toDriver(value) {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
});

/** Colonnes de timestamps communes (timestamptz). */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Colonne de soft-delete (uniquement users & stores). */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};
