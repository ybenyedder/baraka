import Constants from 'expo-constants';
import { prefs } from './storage';
import type {
  NearbyResponse,
  SessionUser,
  StoreDetail,
  BagCard,
  Order,
  CreateOrderInput,
  UserImpact,
  CreateReview,
  FavoriteStore,
} from '@baraka/shared';

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3001';

/**
 * Erreur d'API portant le status HTTP, pour permettre un traitement différencié
 * (ex : au boot, on ne déconnecte que sur 401/403, pas sur une panne réseau/5xx).
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Handler global de session invalide : appelé quand une requête AUTHENTIFIÉE reçoit un
// 401/403 (token expiré/révoqué). Enregistré par la couche session pour déclencher un
// signOut propre au lieu de laisser l'app boucler sur des erreurs (retry désactivé sur 4xx).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/**
 * Absolutise les URLs de médias relatives (`/u/...`) : l'API mono-origine les renvoie
 * relatives pour le web same-origin, mais React Native exige une URL complète.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

async function request<T>(path: string, init?: RequestInit, authToken?: string): Promise<T> {
  // `authToken` explicite : utilisé au logout pour authentifier le désenregistrement device
  // avec le token qu'on vient de purger (sinon le cache serait déjà vide → 401).
  const token = authToken ?? prefs.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    // Session invalidée côté serveur sur une requête authentifiée → déconnexion centralisée.
    // (Un 401 anonyme — login/register avec mauvais identifiants — ne doit PAS déclencher ça,
    //  d'où la garde `token`.)
    if ((res.status === 401 || res.status === 403) && token) onUnauthorized?.();
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(res.status, body?.error?.message ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,

  // ── Auth ──
  login: (email: string, password: string) =>
    request<{ token: string; user: SessionUser }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (input: {
    email: string;
    password: string;
    name: string;
    locale: string;
    referralCode?: string;
  }) =>
    request<{ token: string; user: SessionUser }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  me: () => request<SessionUser>('/v1/auth/me'),
  deleteAccount: () => request<{ deleted: boolean }>('/v1/users/me', { method: 'DELETE' }),

  // ── Découverte ──
  nearby: (params: {
    lat: number;
    lng: number;
    radius?: number;
    category?: string;
    dietary?: string[];
    pickupBefore?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    qs.set('radius', String(params.radius ?? 5000));
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (params.pickupBefore) qs.set('pickupBefore', params.pickupBefore);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.cursor) qs.set('cursor', params.cursor);
    for (const d of params.dietary ?? []) qs.append('dietary', d);
    return request<NearbyResponse>(`/v1/discovery/stores/nearby?${qs.toString()}`);
  },
  storeDetail: (slug: string) => request<StoreDetail>(`/v1/discovery/stores/${slug}`),
  /** Détail autoritatif d'un panier (prix vérifié pour le checkout, non falsifiable). */
  bagDetail: (bagInstanceId: string) => request<BagCard>(`/v1/discovery/bags/${bagInstanceId}`),

  // ── Commandes ──
  createOrder: (input: CreateOrderInput) =>
    request<
      Pick<Order, 'id' | 'number' | 'status' | 'paymentMethod' | 'quantity' | 'pickupCode'> & {
        payment?: Order['payment'];
      }
    >('/v1/orders', { method: 'POST', body: JSON.stringify(input) }),
  listOrders: () => request<{ items: Order[] }>('/v1/orders'),
  getOrder: (id: string) => request<Order>(`/v1/orders/${id}`),
  cancelOrder: (id: string, reason?: string) =>
    request<{ status: string; refundDue: boolean }>(`/v1/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  confirmPickup: (id: string) =>
    request<{ status: string }>(`/v1/orders/${id}/confirm-pickup`, { method: 'POST' }),

  // ── Devices / notifications ──
  registerDevice: (input: {
    expoPushToken: string;
    platform: 'ios' | 'android' | 'web';
    locale?: string;
  }) => request<{ ok: boolean }>('/v1/devices', { method: 'POST', body: JSON.stringify(input) }),
  unregisterDevice: (expoPushToken: string, authToken?: string) =>
    request<{ ok: boolean }>(
      '/v1/devices',
      { method: 'DELETE', body: JSON.stringify({ expoPushToken }) },
      authToken,
    ),
  notifications: () => request<{ items: unknown[]; unread: number }>('/v1/notifications'),
  markAllRead: () => request<{ ok: boolean }>('/v1/notifications/read-all', { method: 'POST' }),

  // ── Commerçant ──
  validatePickup: (pickupCode: string) =>
    request<{ status: string }>('/v1/merchant/orders/validate', {
      method: 'POST',
      body: JSON.stringify({ pickupCode }),
    }),

  // ── Engagement (M4) ──
  favorites: () => request<{ items: FavoriteStore[] }>('/v1/favorites'),
  addFavorite: (storeId: string) =>
    request<{ ok: boolean }>(`/v1/favorites/${storeId}`, { method: 'POST' }),
  removeFavorite: (storeId: string) =>
    request<{ ok: boolean }>(`/v1/favorites/${storeId}`, { method: 'DELETE' }),
  impact: () => request<UserImpact>('/v1/impact'),
  referrals: () => request<{ code: string; invited: number; rewarded: number }>('/v1/referrals'),
  createReview: (orderId: string, input: CreateReview) =>
    request<unknown>(`/v1/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
