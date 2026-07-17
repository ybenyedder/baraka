import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';
import { prefs } from './storage';

// Affiche les notifications même quand l'app est au premier plan (sinon, comportement par
// défaut : rien ne s'affiche à l'écran). Enregistré une seule fois à l'import du module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Demande la permission, récupère le token Expo Push et l'enregistre côté API.
 * Appelé après connexion. Silencieux en cas d'échec (ex : simulateur).
 */
export async function registerForPush(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined))
      .data;

    await api.registerDevice({
      expoPushToken: token,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      locale: prefs.getLocale(),
    });
  } catch {
    /* pas de push sur cet appareil — ignore */
  }
}

/**
 * Désenregistre le device courant côté API (appelé au logout).
 * Best-effort : avale toute erreur (permission absente, réseau, simulateur…) pour ne
 * jamais bloquer la déconnexion. `authToken` est le token de la session qu'on vient de
 * fermer : la session locale est déjà purgée (clear synchrone), donc le DELETE doit
 * s'authentifier avec ce token capturé, sinon il partirait anonyme (401) — ou pire, avec
 * le token d'un compte reconnecté entre-temps (il désenregistrerait SON device).
 */
export async function unregisterForPush(authToken?: string): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const pushToken = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;

    await api.unregisterDevice(pushToken, authToken);
  } catch {
    /* désenregistrement best-effort — ignore */
  }
}
