import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * N'insiste pas sur une erreur cliente (4xx) : elle est déterministe (401 session morte,
 * 404 introuvable, 409 conflit d'état) — retenter ne fait que gaspiller batterie/data et
 * retarder l'affichage de l'erreur. On ne retente (2×) que les pannes réseau/serveur (5xx,
 * timeout), potentiellement transitoires.
 */
function retryOnlyServerErrors(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: retryOnlyServerErrors,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Une mutation (réservation, annulation…) ne doit jamais être rejouée en aveugle.
      retry: false,
    },
  },
});
