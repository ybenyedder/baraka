import { Pressable, View, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, fontFamily } from '@/lib/theme';

interface BaseProps {
  placeholder: string;
}

/** Barre de recherche pilule. Deux modes : bouton (renvoie vers Parcourir) ou champ actif. */
export function SearchBar(
  props: BaseProps &
    (
      | { mode: 'button'; onPress: () => void }
      | {
          mode?: 'input';
          value: string;
          onChangeText: (v: string) => void;
          onSubmit?: () => void;
          autoFocus?: boolean;
        }
    ),
) {
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 999,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Search size={19} color={colors.muted} strokeWidth={2.2} />
      {props.mode === 'button' ? (
        <AppText variant="body" tone="muted">
          {props.placeholder}
        </AppText>
      ) : (
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          onSubmitEditing={props.onSubmit}
          placeholder={props.placeholder}
          placeholderTextColor={colors.muted}
          autoFocus={props.autoFocus}
          returnKeyType="search"
          style={{
            flex: 1,
            fontFamily: fontFamily('regular'),
            fontSize: 14,
            color: colors.ink,
            paddingVertical: 0,
          }}
        />
      )}
    </View>
  );

  if (props.mode === 'button') {
    return (
      <Pressable onPress={props.onPress} accessibilityRole="search">
        {inner}
      </Pressable>
    );
  }
  return inner;
}
