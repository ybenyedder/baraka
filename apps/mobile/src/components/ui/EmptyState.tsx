import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '@/lib/theme';

/** État vide illustré (favoris, commandes, recherche sans résultat). */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 64, gap: 12 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.creamDeep,
        }}
      >
        <Icon size={32} color={colors.pine} strokeWidth={2} />
      </View>
      <AppText variant="title" tone="pine" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </View>
  );
}
