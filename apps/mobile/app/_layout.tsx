import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { reloadAppAsync } from 'expo';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query';
import { initI18n, detectDeviceLocale } from '@/lib/i18n';
import { prefs, hydrateToken } from '@/lib/storage';
import { useSession } from '@/store/session';
import { api, ApiError } from '@/lib/api';
import { APP_FONTS } from '@/lib/fonts';
import { colors } from '@/lib/theme';
import type { Locale } from '@baraka/i18n';
import '../global.css';

// Garde le splash affiché tant que polices + i18n + session ne sont pas prêts.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts(APP_FONTS);
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const bootstrap = useSession((s) => s.bootstrap);
  const signOut = useSession((s) => s.signOut);

  // Tap sur une notification (app en fond/fermée) → ouvre la commande concernée.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { orderId?: string } | undefined;
      if (data?.orderId) router.push(`/(customer)/order/${data.orderId}`);
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const stored = prefs.getLocale() as Locale | undefined;
    const locale = stored ?? detectDeviceLocale();

    let cancelled = false;
    async function boot() {
      await initI18n(locale);
      await hydrateToken();
      // Réhydrate la session AVANT tout appel réseau : si un token subsiste, l'utilisateur
      // est marqué authentifié (avec son dernier profil connu) immédiatement — sinon une panne
      // réseau au boot renverrait un utilisateur connecté vers l'écran d'accueil.
      bootstrap();
      const token = prefs.getToken();
      if (token) {
        try {
          const user = await api.me();
          if (!cancelled) setSession(token, user);
        } catch (err) {
          // On ne déconnecte QUE si le serveur invalide le token (401/403).
          // Sur une panne réseau ou un 5xx, on garde la session (mode dégradé) : le profil
          // se réhydrate au prochain appel réussi.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            if (!cancelled) signOut();
          } else {
            console.warn('[boot] /auth/me indisponible, démarrage en mode dégradé', err);
          }
        }
      }
      if (!cancelled) setReady(true);
    }

    // Direction RTL (arabe) : appliquée nativement puis reload unique pour prendre effet
    // dès le démarrage (sinon l'UI arabe reste en LTR sur le marché cible). Si le reload
    // échoue, on démarre quand même (sinon le splash resterait affiché indéfiniment).
    const shouldRTL = locale === 'ar';
    if (I18nManager.isRTL !== shouldRTL) {
      I18nManager.allowRTL(shouldRTL);
      I18nManager.forceRTL(shouldRTL);
      reloadAppAsync().catch(() => {
        if (!cancelled) void boot();
      });
      return () => {
        cancelled = true;
      };
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [setSession, bootstrap, signOut]);

  // Masque le splash quand tout est prêt (y compris le chemin reload RTL, qui
  // remonte ce composant : fontsLoaded/ready repassent par ici).
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(merchant)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
