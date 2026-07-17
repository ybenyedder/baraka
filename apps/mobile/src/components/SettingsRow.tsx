import type { ReactNode } from 'react';
import { Pressable, View, I18nManager } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { colors } from '@/lib/theme';

/** Rangée de réglage : icône + libellé + chevron (profil). */
export function SettingsRow({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
  right,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  right?: ReactNode;
}) {
  const color = tone === 'danger' ? '#dc2626' : colors.pine;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 15,
        paddingHorizontal: 16,
        backgroundColor: pressed ? colors.creamDeep : colors.white,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone === 'danger' ? '#fee2e2' : colors.creamDeep,
        }}
      >
        <Icon size={18} color={color} strokeWidth={2.2} />
      </View>
      <AppText
        variant="subtitle"
        color={tone === 'danger' ? '#dc2626' : colors.ink}
        style={{ flex: 1 }}
      >
        {label}
      </AppText>
      {right}
      <ChevronRight
        size={18}
        color={colors.mutedSoft}
        strokeWidth={2.2}
        style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      />
    </Pressable>
  );
}
