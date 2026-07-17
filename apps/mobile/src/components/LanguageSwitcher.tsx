import { View, Text, Pressable, I18nManager, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LOCALES, LOCALE_LABELS, isRTL, type Locale } from '@baraka/i18n';
import { prefs } from '@/lib/storage';
import { i18n } from '@/lib/i18n';

/**
 * Sélecteur de langue. Le passage vers/depuis l'arabe (RTL) nécessite un redémarrage
 * de l'app : on force la direction et on prévient l'utilisateur.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation('common');

  async function choose(locale: Locale) {
    const willBeRTL = isRTL(locale);
    prefs.setLocale(locale);
    await i18n.changeLanguage(locale);

    if (willBeRTL !== I18nManager.isRTL) {
      I18nManager.allowRTL(willBeRTL);
      I18nManager.forceRTL(willBeRTL);
      // Un rechargement est nécessaire pour appliquer la direction (via expo-updates en prod).
      Alert.alert(t('language.title'), t('language.rtlNotice'));
    }
  }

  return (
    <View className="flex-row gap-2">
      {LOCALES.map((l) => (
        <Pressable
          key={l}
          onPress={() => choose(l)}
          className="rounded-lg border border-black/10 bg-white px-3 py-2"
        >
          <Text className="text-brand-ink">{LOCALE_LABELS[l]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
