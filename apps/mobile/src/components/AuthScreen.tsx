import type { ReactNode } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { colors } from '@/lib/theme';

/**
 * Coquille des écrans connexion / inscription :
 * - bouton retour fixe en haut (revient à l'accueil si pile vide) ;
 * - `KeyboardAvoidingView` + `ScrollView` pour que le clavier ne masque jamais
 *   les champs ni le bouton d'action (le vrai défaut d'ergonomie initial) ;
 * - contenu centré verticalement tant qu'il tient à l'écran.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  const router = useRouter();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/welcome');
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.cream }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <IconButton
            icon={ArrowLeft}
            tone="ghost"
            mirrorRTL
            onPress={goBack}
            accessibilityLabel="Retour"
          />
        </View>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
