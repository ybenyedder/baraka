import { Modal, View, ScrollView, Pressable } from 'react-native';
import { LocateFixed, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from './ui/AppText';
import { Chip } from './ui/Chip';
import { PrimaryButton } from './ui/PrimaryButton';
import { IconButton } from './ui/IconButton';
import { useLocation } from '@/hooks/useLocation';
import { useLocationStore, CITY_PRESETS, RADIUS_PRESETS } from '@/store/location';
import { colors } from '@/lib/theme';

/** Feuille modale : « ma position », villes prédéfinies, rayon de recherche. */
export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation('discovery');
  const { locate, locating, label, radiusM } = useLocation();
  const setPosition = useLocationStore((s) => s.setPosition);
  const setRadius = useLocationStore((s) => s.setRadius);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: colors.cream,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <AppText variant="display">{t('location.title')}</AppText>
            <IconButton icon={X} tone="ghost" size={32} onPress={onClose} />
          </View>

          <PrimaryButton
            icon={LocateFixed}
            variant="pine"
            label={t('location.useMine')}
            loading={locating}
            onPress={async () => {
              const ok = await locate();
              if (ok) onClose();
            }}
          />

          <AppText variant="label" tone="muted">
            {t('location.cities')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CITY_PRESETS.map((c) => (
              <Chip
                key={c.label}
                label={c.label}
                selected={label === c.label}
                onPress={() =>
                  setPosition({ lat: c.lat, lng: c.lng, label: c.label, source: 'manual' })
                }
              />
            ))}
          </View>

          <AppText variant="label" tone="muted">
            {t('location.radius')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {RADIUS_PRESETS.map((r) => (
              <Chip
                key={r}
                label={`${r / 1000} km`}
                selected={radiusM === r}
                onPress={() => setRadius(r)}
              />
            ))}
          </View>

          <PrimaryButton label={t('location.done')} onPress={onClose} style={{ marginTop: 4 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
