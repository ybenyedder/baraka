'use client';

import type {
  SessionUser,
  MerchantStats,
  MerchantAnalytics,
  MerchantOrder,
  ApplyMerchant,
  UpdateMerchantProfile,
  UpsertStore,
  UpsertBagTemplate,
  UpsertSchedule,
  AdjustInstance,
  Order,
  OrderStatus,
  RegisterInput,
} from '@baraka/shared';

// Mono-origine : `NEXT_PUBLIC_API_URL` vide (ou absent en prod) → chemins relatifs,
// proxifiés vers l'API par les rewrites Next (voir next.config.mjs). En dev, l'API
// tourne à côté sur le port 3001.
const API =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
const USER_KEY = 'baraka_user';
/** Événement émis à chaque login/logout pour rafraîchir le header. */
export const AUTH_EVENT = 'baraka:auth';

/**
 * Le token d'auth vit désormais dans un cookie HttpOnly posé par l'API (inaccessible au JS,
 * donc NON exfiltrable par XSS). Le web ne conserve en localStorage que le profil (non secret)
 * pour l'état d'UI ; `getToken()` ne renvoie qu'un marqueur « connecté » compatible avec le code
 * existant. Les requêtes envoient le cookie via `credentials: 'include'`.
 */
export function getToken(): string | null {
  return getStoredUser() ? 'cookie' : null;
}
export function setSession(_token: string, user: SessionUser): void {
  // _token ignoré : la session est portée par le cookie HttpOnly (posé par la réponse de l'API).
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}
/** @deprecated no-op — la session est un cookie HttpOnly. */
export function setToken(_token: string): void {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function clearSession(): void {
  window.localStorage.removeItem(USER_KEY);
  // Efface le cookie de session côté serveur (best-effort).
  void fetch(`${API}/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export const clearToken = clearSession;
export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include', // envoie le cookie de session HttpOnly
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401 && getStoredUser()) clearSession();
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Upload multipart (le navigateur pose lui-même le boundary — pas de Content-Type manuel). */
async function authUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Abonnement SSE authentifié (EventSource ne porte pas de header Authorization :
 * on lit le flux via fetch + ReadableStream). Retourne une fonction de désabonnement.
 */
export function subscribeStoreOrders(
  storeId: string,
  onEvent: (event: string) => void,
): () => void {
  const ctrl = new AbortController();
  void (async () => {
    try {
      const res = await fetch(`${API}/v1/merchant/stores/${storeId}/orders/stream`, {
        credentials: 'include', // cookie de session envoyé automatiquement (même origine)
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const eventLine = frame.split('\n').find((l) => l.startsWith('event:'));
          if (eventLine) onEvent(eventLine.slice(6).trim());
        }
      }
    } catch {
      // Flux interrompu (navigation / abort) — silencieux.
    }
  })();
  return () => ctrl.abort();
}

export interface WebOrderCreated {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  quantity: number;
  total: { amountMinor: number; currency: string };
  pickupCode: string | null;
  payment?: Order['payment'];
}

export const webApi = {
  // Auth
  login: (email: string, password: string) =>
    authFetch<{ token: string; user: SessionUser }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (input: RegisterInput) =>
    authFetch<{ token: string; user: SessionUser }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  me: () => authFetch<SessionUser>('/v1/auth/me'),

  // Commandes client (réservation navigateur)
  createOrder: (input: { bagInstanceId: string; quantity: number; paymentMethod: 'cash' }) =>
    authFetch<WebOrderCreated>('/v1/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  myOrders: () => authFetch<{ items: Order[] }>('/v1/orders'),
  cancelOrder: (orderId: string) =>
    authFetch<{ status: string; refundDue: boolean }>(`/v1/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Merchant — compte
  applyMerchant: (input: ApplyMerchant) =>
    authFetch<{ id: string; status: string }>('/v1/merchant/apply', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  myMerchant: () => authFetch<WebMerchantProfile>('/v1/merchant/me'),
  updateMerchant: (input: UpdateMerchantProfile) =>
    authFetch<WebMerchantProfile>('/v1/merchant/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  merchantStats: () => authFetch<MerchantStats>('/v1/merchant/stats'),
  merchantAnalytics: (days = 30) =>
    authFetch<MerchantAnalytics>(`/v1/merchant/analytics?days=${days}`),
  merchantOrders: (q?: {
    storeId?: string;
    scope?: 'today' | 'all';
    status?: OrderStatus;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (q?.storeId) params.set('storeId', q.storeId);
    if (q?.scope) params.set('scope', q.scope);
    if (q?.status) params.set('status', q.status);
    if (q?.limit) params.set('limit', String(q.limit));
    const qs = params.toString();
    return authFetch<{ items: MerchantOrder[] }>(`/v1/merchant/orders${qs ? `?${qs}` : ''}`);
  },
  myPayouts: () => authFetch<{ items: WebPayout[] }>('/v1/merchant/payouts'),

  // Merchant — boutiques
  myStores: () => authFetch<{ items: WebStore[] }>('/v1/merchant/stores'),
  createStore: (input: UpsertStore) =>
    authFetch<{ id: string; slug: string }>('/v1/merchant/stores', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateStore: (storeId: string, input: UpsertStore) =>
    authFetch<{ ok: boolean }>(`/v1/merchant/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  setStoreStatus: (storeId: string, status: 'active' | 'paused') =>
    authFetch<{ ok: boolean }>(`/v1/merchant/stores/${storeId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  uploadStoreImage: (storeId: string, file: File, type: 'cover' | 'logo') =>
    authUpload<{ url: string }>(`/v1/merchant/stores/${storeId}/image?type=${type}`, file),

  // Merchant — paniers & plannings
  templates: (storeId: string) =>
    authFetch<{ items: WebTemplate[] }>(`/v1/merchant/stores/${storeId}/templates`),
  createTemplate: (storeId: string, input: UpsertBagTemplate) =>
    authFetch<WebTemplate>(`/v1/merchant/stores/${storeId}/templates`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTemplate: (templateId: string, input: UpsertBagTemplate) =>
    authFetch<{ ok: boolean }>(`/v1/merchant/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  uploadTemplateImage: (templateId: string, file: File) =>
    authUpload<{ url: string }>(`/v1/merchant/templates/${templateId}/image`, file),
  schedules: (templateId: string) =>
    authFetch<{ items: WebSchedule[] }>(`/v1/merchant/templates/${templateId}/schedules`),
  upsertSchedule: (templateId: string, input: UpsertSchedule) =>
    authFetch<{ ok: boolean }>(`/v1/merchant/templates/${templateId}/schedules`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteSchedule: (scheduleId: string) =>
    authFetch<{ ok: boolean }>(`/v1/merchant/schedules/${scheduleId}`, { method: 'DELETE' }),

  // Merchant — instances du jour & retraits
  todayInstances: (storeId: string) =>
    authFetch<{ items: WebInstance[] }>(`/v1/merchant/stores/${storeId}/instances/today`),
  adjustInstance: (instanceId: string, input: AdjustInstance) =>
    authFetch<{ ok: boolean }>(`/v1/merchant/instances/${instanceId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  validatePickup: (pickupCode: string) =>
    authFetch<{ status: string }>('/v1/merchant/orders/validate', {
      method: 'POST',
      body: JSON.stringify({ pickupCode }),
    }),

  // Admin
  adminStats: () =>
    authFetch<{
      users: number;
      merchants: number;
      activeStores: number;
      ordersToday: number;
      gmvTodayMinor: number;
      bagsSavedTotal: number;
    }>('/v1/admin/stats'),
  adminMerchants: (status?: string) =>
    authFetch<{ items: WebMerchant[] }>(`/v1/admin/merchants${status ? `?status=${status}` : ''}`),
  decideMerchant: (
    merchantId: string,
    status: 'approved' | 'rejected' | 'suspended',
    notes?: string,
  ) =>
    authFetch<{ status: string }>(`/v1/admin/merchants/${merchantId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
};

export interface WebMerchantProfile {
  id: string;
  status: string;
  legalName: string;
  taxId: string | null;
  contactEmail: string;
  contactPhone: string | null;
  payoutIban: string | null;
  commissionBps: number;
  createdAt: string;
}
export interface WebStore {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  addressLine: string;
  city: string;
  governorate: string | null;
  lat: number;
  lng: number;
  openingHours: Record<string, string> | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
}
export interface WebTemplate {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  bagCategory: string;
  dietary: string[];
  priceMinor: number;
  originalValueMinor: number;
  currency: string;
  active: boolean;
  imageUrl: string | null;
}
export interface WebSchedule {
  id: string;
  weekday: number;
  pickupStart: string;
  pickupEnd: string;
  quantity: number;
}
export interface WebInstance {
  id: string;
  title: string;
  status: string;
  pickup_start_at: string;
  pickup_end_at: string;
  quantity_total: number;
  quantity_reserved: number;
  quantity_sold: number;
  price_minor: number;
  currency: string;
}
export interface WebPayout {
  id: string;
  periodStart: string;
  periodEnd: string;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
  currency: string;
  status: string;
  paidAt: string | null;
  bankReference: string | null;
}
export interface WebMerchant {
  id: string;
  legalName: string;
  contactEmail: string;
  status: string;
  createdAt: string;
}
