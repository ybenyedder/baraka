import type { ExpoConfig } from 'expo/config';

/**
 * Config Expo Baraka. Deep links via scheme `baraka://` + universal links.
 * Dev client requis (MapLibre + MMKV natifs) — Expo Go n'est pas supporté.
 */

// URL de l'API résolue une seule fois (réutilisée dans `extra` + gardes de build).
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const isProd = process.env.APP_ENV === 'production';

// Garde de build : en production, on refuse une API non-HTTPS (le trafic en clair
// exposerait le token). Le build échoue tôt plutôt que de livrer une app vulnérable.
if (isProd && !apiUrl.startsWith('https://')) {
  throw new Error(
    `[Baraka] Build de production refusé : EXPO_PUBLIC_API_URL doit être en HTTPS (reçu « ${apiUrl} »).`,
  );
}

const config: ExpoConfig = {
  name: 'Baraka',
  slug: 'baraka',
  scheme: 'baraka',
  version: '1.0.1',
  orientation: 'portrait',
  // Design verrouillé en clair (pas de mode sombre dans cette refonte).
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'tn.baraka.app',
    infoPlist: {
      // Localisation « pendant l'utilisation » uniquement (évite une revue Apple lourde).
      NSLocationWhenInUseUsageDescription:
        'Baraka utilise ta position pour te montrer les paniers à proximité.',
    },
  },
  android: {
    package: 'tn.baraka.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#005248',
    },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    'expo-notifications',
    'expo-font',
    // Carte : MapLibre (tuiles libres, pas de clé Mapbox/Google requise).
    '@maplibre/maplibre-react-native',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', backgroundColor: '#005248', imageWidth: 200 },
    ],
    // Kotlin 1.9.25 (Compose Compiler). HTTP en clair autorisé UNIQUEMENT hors production
    // (tests d'une API locale non-HTTPS) — interdit en prod (voir garde ci-dessus).
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '1.9.25',
          usesCleartextTraffic: process.env.APP_ENV !== 'production',
        },
      },
    ],
  ],
  // typedRoutes désactivé tant que les types de routes ne sont pas générés (1er `expo start`).
  experiments: { typedRoutes: false },
  extra: {
    apiUrl,
    // Style de carte MapLibre — tuiles vectorielles libres, sans clé.
    mapStyleUrl:
      process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
    router: { origin: false },
  },
};

export default config;
