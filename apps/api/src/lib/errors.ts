/**
 * Erreurs applicatives typées. Le gestionnaire d'erreurs Fastify les traduit en
 * réponses JSON { error: { code, message, details } } avec le bon statut HTTP.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  unauthorized: (msg = 'Authentification requise') => new AppError(401, 'unauthorized', msg),
  forbidden: (msg = 'Accès refusé') => new AppError(403, 'forbidden', msg),
  notFound: (msg = 'Ressource introuvable') => new AppError(404, 'not_found', msg),
  conflict: (msg: string, details?: unknown) => new AppError(409, 'conflict', msg, details),
  soldOut: (msg = 'Panier épuisé') => new AppError(409, 'sold_out', msg),
  badRequest: (msg: string, details?: unknown) => new AppError(400, 'bad_request', msg, details),
  tooLate: (msg = 'Trop tard pour cette action') => new AppError(422, 'too_late', msg),
  paymentRequired: (msg = 'Paiement requis') => new AppError(402, 'payment_required', msg),
  internal: (msg = 'Erreur interne') => new AppError(500, 'internal', msg),
};
