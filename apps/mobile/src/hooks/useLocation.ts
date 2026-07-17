import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useLocationStore } from '@/store/location';

/**
 * Expose la position de découverte + une action « utiliser ma position » qui
 * demande la permission, géolocalise, et tente un reverse-geocode pour le libellé.
 * Repli silencieux sur la position persistée (Tunis) si refus/erreur.
 */
export function useLocation() {
  const state = useLocationStore();
  const { t } = useTranslation('discovery');
  const [locating, setLocating] = useState(false);

  const locate = useCallback(async (): Promise<boolean> => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return false;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let label = t('location.mine');
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        label = geo[0]?.city ?? geo[0]?.subregion ?? geo[0]?.region ?? label;
      } catch {
        // reverse-geocode best-effort : on garde le libellé par défaut.
      }
      useLocationStore
        .getState()
        .setPosition({ lat: latitude, lng: longitude, label, source: 'gps' });
      return true;
    } catch {
      return false;
    } finally {
      setLocating(false);
    }
  }, [t]);

  return { ...state, locating, locate };
}
