import { create } from 'zustand';
import { prefs, type StoredLocation } from '@/lib/storage';

/** Centre de Tunis — position de repli quand la géoloc est refusée/indisponible. */
export const TUNIS = { lat: 36.8008, lng: 10.1815 };

/** Rayons de recherche proposés (en mètres). */
export const RADIUS_PRESETS = [1000, 3000, 5000, 10000, 20000] as const;

/** Villes tunisiennes proposées dans le sélecteur de position. */
export const CITY_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: 'Tunis', lat: 36.8008, lng: 10.1815 },
  { label: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { label: 'Sousse', lat: 35.8256, lng: 10.6084 },
  { label: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { label: 'Nabeul', lat: 36.4513, lng: 10.7357 },
  { label: 'Bizerte', lat: 37.2744, lng: 9.8739 },
];

const DEFAULT: StoredLocation = {
  ...TUNIS,
  radiusM: 5000,
  label: 'Tunis',
  source: 'fallback',
};

interface LocationState extends StoredLocation {
  /** Fixe une position (GPS ou ville manuelle) en conservant le rayon courant. */
  setPosition: (p: { lat: number; lng: number; label: string; source: 'gps' | 'manual' }) => void;
  setRadius: (radiusM: number) => void;
}

/** Position de découverte globale — persistée en MMKV, repli sur Tunis. */
export const useLocationStore = create<LocationState>((set, get) => {
  const stored = prefs.getLocation() ?? DEFAULT;
  return {
    ...stored,
    setPosition: ({ lat, lng, label, source }) => {
      const next = { lat, lng, label, source, radiusM: get().radiusM };
      prefs.setLocation(next);
      set(next);
    },
    setRadius: (radiusM) => {
      const { lat, lng, label, source } = get();
      const next = { lat, lng, label, source, radiusM };
      prefs.setLocation(next);
      set({ radiusM });
    },
  };
});
