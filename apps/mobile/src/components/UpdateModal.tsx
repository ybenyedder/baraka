import { Modal, View, ScrollView, Pressable, Linking, Platform } from 'react-native';
import { Download, Sparkles, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './ui/AppText';
import { PrimaryButton } from './ui/PrimaryButton';
import { IconButton } from './ui/IconButton';
import { colors, radii } from '@/lib/theme';
import type { UpdateInfo } from '@/lib/updater';
import { skipUpdate } from '@/lib/updater';

/**
 * Modale de mise à jour : propose le téléchargement de la dernière release
 * GitHub (APK Android). Ouverture du navigateur système → installation sideload
 * standard. L'utilisateur peut ignorer cette version (ne sera pas re-proposée).
 */
export function UpdateModal({ info, onClose }: { info: UpdateInfo; onClose: () => void }) {
  const { t } = useTranslation('common');

  const openDownload = () => {
    void Linking.openURL(info.downloadUrl);
  };

  const handleSkip = () => {
    skipUpdate(info.tag);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={handleSkip} />
        <SafeAreaView
          edges={[]}
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: colors.cream,
            borderRadius: radii.card,
            padding: 24,
            gap: 14,
          }}
        >
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton icon={X} tone="ghost" size={32} onPress={handleSkip} />
          </View>

          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.pill,
              backgroundColor: colors.yellow,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={28} color={colors.pine} strokeWidth={2.2} />
          </View>

          <AppText variant="display">{t('update.title')}</AppText>
          <AppText variant="subtitle">{t('update.version', { version: info.version })}</AppText>
          {info.notes ? (
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              <AppText variant="caption" style={{ lineHeight: 18 }}>
                {info.notes}
              </AppText>
            </ScrollView>
          ) : (
            <AppText variant="body" tone="muted">
              {t('update.text')}
            </AppText>
          )}

          {Platform.OS === 'android' && (
            <AppText variant="caption">{t('update.installHint')}</AppText>
          )}

          <PrimaryButton icon={Download} label={t('update.download')} onPress={openDownload} />
          <Pressable onPress={handleSkip} hitSlop={12} style={{ paddingVertical: 6 }}>
            <AppText variant="label" tone="muted" style={{ textAlign: 'center' }}>
              {t('update.later')}
            </AppText>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
