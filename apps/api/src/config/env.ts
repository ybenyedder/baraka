import { z } from 'zod';
import { CURRENCY_CODES } from '@baraka/shared';

/**
 * Configuration d'environnement validée. Lue une seule fois au démarrage.
 * Un défaut manquant en production doit faire échouer le boot (fail-fast).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres')),

  AUTH_SECRET: z.string().min(16).default('dev_secret_change_me_at_least_16_chars'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:8081')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  PUBLIC_API_URL: z.string().default('http://localhost:3001'),
  PUBLIC_WEB_URL: z.string().default('http://localhost:3000'),

  DEFAULT_CURRENCY: z.enum(CURRENCY_CODES).default('TND'),
  PAYMENT_PROVIDERS: z
    .string()
    .default('cash')
    .transform((s) =>
      s
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    ),

  // Konnect
  KONNECT_API_URL: z.string().default('https://api.sandbox.konnect.network/api/v2'),
  KONNECT_API_KEY: z.string().optional(),
  KONNECT_WALLET_ID: z.string().optional(),

  // Stripe (dormant)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Stockage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/uploads'),
  STORAGE_PUBLIC_URL: z.string().default('http://localhost:3001/u'),

  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Cartes / géocodage
  NOMINATIM_URL: z.string().default('https://nominatim.openstreetmap.org'),
  MAP_TILES_URL: z.string().default('https://tiles.openfreemap.org/styles/liberty'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  // Fail-fast production : refuse les secrets placeholder connus (sinon JWT forgeable).
  if (parsed.data.NODE_ENV === 'production') {
    const placeholders = new Set([
      'dev_secret_change_me_at_least_16_chars',
      'change_me_openssl_rand_hex_32',
      'generer_avec_openssl_rand_hex_32',
    ]);
    if (placeholders.has(parsed.data.AUTH_SECRET)) {
      throw new Error(
        'AUTH_SECRET est une valeur par défaut/placeholder — générez-en une avec `openssl rand -hex 32` avant de démarrer en production.',
      );
    }
  }

  cached = parsed.data;
  return cached;
}

export const env = loadEnv();
