import type { FastifyInstance } from 'fastify';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { env } from '../config/env';

// Liste blanche d'images rasterisées uniquement. Volontairement PAS de '.svg' : servi inline
// same-origin, un SVG peut porter du script (XSS stocké). Le stockage refuse déjà les autres
// extensions (voir lib/storage), c'est une défense en profondeur (L4).
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

/**
 * Sert les fichiers uploadés en stockage local (`STORAGE_DRIVER=local`) sous `/u/<clé>`.
 * En prod « compose » c'est Caddy qui s'en charge ; cette route rend les déploiements
 * sans reverse-proxy (ex. Pterodactyl) autonomes. Les clés sont des noms de fichiers
 * plats (voir `lib/storage`), donc tout chemin est refusé.
 */
export function uploadRoutes(app: FastifyInstance): void {
  if (env.STORAGE_DRIVER !== 'local') return;

  // Fichiers statiques servis en volume (≈20 vignettes/page) : hors du limiteur de débit global,
  // sinon quelques pages riches en images épuisent le budget partagé (H3).
  app.get<{ Params: { '*': string } }>(
    '/u/*',
    { config: { rateLimit: false } },
    async (req, reply) => {
      const key = req.params['*'];
      if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) {
        return reply.code(404).send({ error: 'not_found' });
      }
      const filePath = normalize(join(env.STORAGE_LOCAL_DIR, key));
      try {
        const buffer = await readFile(filePath);
        const type = CONTENT_TYPES[extname(key).toLowerCase()] ?? 'application/octet-stream';
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.type(type).send(buffer);
      } catch {
        return reply.code(404).send({ error: 'not_found' });
      }
    },
  );
}
