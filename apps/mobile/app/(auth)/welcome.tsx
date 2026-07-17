import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Logo } from '@/components/ui/Logo';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { colors } from '@/lib/theme';

export default function Welcome() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const router = useRouter();
  // Icônes claires seulement quand cet écran (fond pine) a le focus — sinon le
  // style « light » resterait actif sur login/register (fond crème, illisible).
  const isFocused = useIsFocused();

  return (
    <View style={{ flex: 1, backgroundColor: colors.pine }}>
      {isFocused ? <StatusBar style="light" /> : null}
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Logo tone="cream" size={56} />
          <AppText
            variant="subtitle"
            color={colors.cream}
            style={{ textAlign: 'center', opacity: 0.9 }}
          >
            {t('tagline')}
          </AppText>
        </View>

        <View style={{ gap: 12, paddingBottom: 8 }}>
          <PrimaryButton
            variant="yellow"
            label={ta('login.submit')}
            onPress={() => router.push('/(auth)/login')}
          />
          <PrimaryButton
            variant="outline-light"
            label={ta('register.submit')}
            onPress={() => router.push('/(auth)/register')}
          />
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <LanguageSwitcher />
        </View>
      </SafeAreaView>
    </View>
  );
}
