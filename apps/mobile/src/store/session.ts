import { create } from 'zustand';
import { prefs } from '../lib/storage';
import { queryClient } from '../lib/query';
import { setUnauthorizedHandler } from '../lib/api';
import { unregisterForPush } from '../lib/push';
import { resetFavoriteOverrides } from './favorites';
import type { SessionUser } from '@baraka/shared';

type AppMode = 'customer' | 'merchant';

interface SessionState {
  user: SessionUser | null;
  mode: AppMode;
  isAuthenticated: boolean;
  setSession: (token: string, user: SessionUser) => void;
  /** Réhydrate la session au démarrage depuis le stockage (mode dégradé hors-ligne). */
  bootstrap: () => void;
  signOut: () => void;
  setMode: (mode: AppMode) => void;
}

/** État de session global (token en Keychain, profil persisté en MMKV). */
export const useSession = create<SessionState>((set) => ({
  user: null,
  mode: 'customer',
  isAuthenticated: false,
  setSession: (token, user) => {
    prefs.setToken(token);
    prefs.setProfile(user);
    set({ user, isAuthenticated: true });
  },
  bootstrap: () => {
    // Appelé APRÈS hydrateToken(). Si un token subsiste, on démarre AUTHENTIFIÉ immédiatement
    // avec le dernier profil connu — sans attendre /auth/me. Sinon, une panne réseau au boot
    // renverrait un utilisateur pourtant connecté vers l'écran d'accueil (isAuthenticated=false).
    const token = prefs.getToken();
    if (!token) return;
    set({ isAuthenticated: true, user: prefs.getProfile() });
  },
  signOut: () => {
    // Purge SYNCHRONE de la session : elle est fermée immédiatement, avant tout appel réseau.
    // (Différer le clear dans un .finally() créait une race : une reconnexion rapide voyait
    //  son nouveau token effacé par le clear en retard de l'ancienne déconnexion.)
    const token = prefs.getToken();
    prefs.clearToken();
    prefs.clearProfile();
    // Vide le cache react-query + les overrides de favoris pour ne pas laisser fuiter les
    // données du compte précédent vers un prochain utilisateur sur le même appareil.
    queryClient.clear();
    resetFavoriteOverrides();
    set({ user: null, isAuthenticated: false, mode: 'customer' });
    // Désenregistrement push best-effort avec le token capturé (la session locale est déjà purgée).
    if (token) void unregisterForPush(token);
  },
  setMode: (mode) => set({ mode }),
}));

// Un 401/403 sur une requête authentifiée (token expiré/révoqué) déconnecte proprement.
setUnauthorizedHandler(() => {
  if (useSession.getState().isAuthenticated) useSession.getState().signOut();
});
