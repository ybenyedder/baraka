import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

/** Convertit les erreurs en réponses JSON { error: { code, message, details } }. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: unknown, req, reply) => {
    if (err instanceof AppError) {
      reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }
    if (err instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'validation_error', message: 'Requête invalide', details: err.issues },
      });
      return;
    }
    // Erreurs de validation Fastify (schema).
    const asErr = err as {
      validation?: unknown;
      statusCode?: number;
      code?: string;
      message?: string;
    };
    if (asErr.validation) {
      reply.status(400).send({
        error: {
          code: 'validation_error',
          message: asErr.message ?? 'Requête invalide',
          details: asErr.validation,
        },
      });
      return;
    }
    // Erreurs Fastify porteuses d'un statut 4xx (ex. 413 fichier trop gros, 429 rate-limit) :
    // les relayer telles quelles plutôt que de les masquer en 500 (L7).
    if (typeof asErr.statusCode === 'number' && asErr.statusCode >= 400 && asErr.statusCode < 500) {
      reply.status(asErr.statusCode).send({
        error: {
          code: asErr.code ?? 'request_error',
          message: asErr.message ?? 'Requête invalide',
        },
      });
      return;
    }
    req.log.error({ err }, 'Erreur non gérée');
    reply.status(500).send({ error: { code: 'internal', message: 'Erreur interne du serveur' } });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: { code: 'not_found', message: `Route ${req.method} ${req.url} introuvable` },
    });
  });
}
