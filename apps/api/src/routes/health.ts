import type { FastifyInstance } from 'fastify';
import { getSql } from '../lib/db';

export function healthRoutes(app: FastifyInstance): void {
  // Sonde de santé (monitoring/orchestrateur) : hors du limiteur de débit global (H3).
  app.get('/healthz', { config: { rateLimit: false } }, async () => {
    let db = false;
    try {
      await getSql()`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { status: db ? 'ok' : 'degraded', db, ts: new Date().toISOString() };
  });

  app.get('/', { config: { rateLimit: false } }, async () => ({
    name: 'Baraka API',
    version: '0.1.0',
  }));
}
