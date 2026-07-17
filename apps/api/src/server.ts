import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { pathToFileURL } from 'node:url';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { env } from './config/env';
import { registerErrorHandler } from './plugins/error-handler';
import { registerAuth } from './plugins/auth';
import { healthRoutes } from './routes/health';
import { uploadRoutes } from './routes/uploads';
import { authRoutes } from './modules/auth/routes';
import { discoveryRoutes } from './modules/discovery/routes';
import { orderRoutes } from './modules/orders/routes';
import { merchantRoutes } from './modules/merchant/routes';
import { paymentRoutes } from './modules/payments/routes';
import { storeRoutes } from './modules/stores/routes';
import { catalogRoutes } from './modules/catalog/routes';
import { adminRoutes } from './modules/admin/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { payoutRoutes } from './modules/payouts/routes';
import { engagementRoutes } from './modules/engagement/routes';
import { closeDb } from './lib/db';
import { sse } from './lib/sse';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    // App mono-origine : tout le trafic navigateur arrive via le proxy interne (Next/Caddy).
    // trustProxy fait refléter X-Forwarded-For dans req.ip → le rate-limit redevient PAR CLIENT
    // réel (et non partagé sur l'IP du proxy). L'API n'est joignable qu'à travers le proxy (H3).
    trustProxy: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Auth par Bearer (pas de cookies) → pas besoin de credentials cross-site.
  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: false });
  // En-têtes de sécurité + limite de débit globale (routes sensibles durcies en plus).
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });
  // Cookies : session web en cookie HttpOnly (le JWT ne vit plus dans localStorage — anti-XSS).
  await app.register(cookie);

  // Swagger/OpenAPI et /docs : jamais exposés publiquement en production.
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Baraka API',
          version: '0.1.0',
          description: 'API de la marketplace anti-gaspi Baraka.',
        },
        servers: [{ url: env.PUBLIC_API_URL }],
        tags: [
          { name: 'auth', description: 'Authentification & comptes' },
          { name: 'discovery', description: 'Découverte des paniers' },
          { name: 'orders', description: 'Réservations & retraits' },
          { name: 'payments', description: 'Paiements & webhooks' },
          { name: 'merchant', description: 'Espace commerçant' },
          { name: 'devices', description: 'Notifications push' },
        ],
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  registerErrorHandler(app);
  registerAuth(app);

  healthRoutes(app);
  uploadRoutes(app);
  authRoutes(app);
  discoveryRoutes(app);
  storeRoutes(app);
  orderRoutes(app);
  merchantRoutes(app);
  catalogRoutes(app);
  adminRoutes(app);
  notificationRoutes(app);
  payoutRoutes(app);
  engagementRoutes(app);
  paymentRoutes(app);

  return app;
}

async function start(): Promise<void> {
  const app = await buildServer();
  const heartbeat = setInterval(() => sse.heartbeatAll(), 25_000);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Signal ${signal} reçu — arrêt en cours…`);
    clearInterval(heartbeat);
    await app.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
  app.log.info(`Baraka API prête sur http://${env.API_HOST}:${env.API_PORT} (docs: /docs)`);
}

// Ne démarre que si exécuté directement (pas à l'import depuis les tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void start();
}
