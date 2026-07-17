import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import type { SessionUser } from '@baraka/shared';

/** Stockage rapide et synchrone (préférences, cache TanStack Query persisté). */
export const storage = new MMKV({ id: 'baraka' });

const KEY_LOCALE = 'locale';
const KEY_LOCATION = 'location';
const KEY_PROFILE = 'session_profile'; // dernier profil connu (non sensible) → mode dégradé au boot
const KEY_LEGACY_TOKEN = 'auth_token'; // ancienne clé MMKV (non chiffrée) → migrée
const SECURE_TOKEN_KEY = 'baraka_auth_token';

/** Position de découverte persistée (dernier choix : GPS ou ville manuelle). */
export interface StoredLocation {
  lat: number;
  lng: number;
  radiusM: number;
  label: string;
  source: 'gps' | 'manual' | 'fallback';
}

// Le token vit dans le Keychain/Keystore (chiffré). On garde un cache mémoire pour
// exposer un accès synchrone aux appels réseau, réhydraté au démarrage via hydrateToken().
let cachedToken: string | null = null;

export const prefs = {
  getLocale: (): string | undefined => storage.getString(KEY_LOCALE),
  setLocale: (locale: string): void => storage.set(KEY_LOCALE, locale),
  getLocation: (): StoredLocation | null => {
    const raw = storage.getString(KEY_LOCATION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredLocation;
    } catch {
      return null;
    }
  },
  setLocation: (loc: StoredLocation): void => storage.set(KEY_LOCATION, JSON.stringify(loc)),
  getToken: (): string | null => cachedToken,
  setToken: (token: string): void => {
    cachedToken = token;
    void SecureStore.setItemAsync(SECURE_TOKEN_KEY, token);
  },
  clearToken: (): void => {
    cachedToken = null;
    void SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
  },
  // Profil (non secret : nom, e-mail, rôle) persisté en clair pour réhydrater la session
  // au démarrage même hors-ligne — le token, lui, reste dans le Keychain chiffré.
  getProfile: (): SessionUser | null => {
    const raw = storage.getString(KEY_PROFILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  },
  setProfile: (user: SessionUser): void => storage.set(KEY_PROFILE, JSON.stringify(user)),
  clearProfile: (): void => storage.delete(KEY_PROFILE),
};

/** Charge le token depuis le stockage sécurisé au démarrage (migre l'ancien token MMKV). */
export async function hydrateToken(): Promise<void> {
  let token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
  if (!token) {
    const legacy = storage.getString(KEY_LEGACY_TOKEN);
    if (legacy) {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, legacy);
      storage.delete(KEY_LEGACY_TOKEN);
      token = legacy;
    }
  }
  cachedToken = token ?? null;
}
