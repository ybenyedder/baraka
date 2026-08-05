import { Redirect } from 'expo-router';
import { useSession } from '@/store/session';

/**
 * Aiguillage initial : l'utilisateur va directement sur les onglets client.
 * Le browse-first : on voit les paniers et les boutiques sans compte.
 * L'auth est demandée uniquement au moment de réserver (checkout).
 */
export default function Index() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const isMerchant = useSession((s) => s.user?.isMerchant ?? false);

  // Un commerçant connecté va sur son espace ; tout le monde else → onglets client.
  if (isAuthenticated && isMerchant) return <Redirect href="/(merchant)/(tabs)" />;
  return <Redirect href="/(customer)/(tabs)" />;
}
