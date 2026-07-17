import { Redirect } from 'expo-router';
import { useSession } from '@/store/session';

/** Aiguillage initial : espace client si connecté, sinon accueil d'authentification. */
export default function Index() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(customer)/(tabs)' : '/(auth)/welcome'} />;
}
