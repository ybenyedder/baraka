import { forwardRef, useState } from 'react';
import { View, TextInput, Pressable, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, fontFamily, radii } from '@/lib/theme';

export interface AuthTextFieldProps extends TextInputProps {
  /** Icône d'amorce (à gauche, ou à droite en RTL). */
  icon?: LucideIcon;
  /** Champ mot de passe : masque la saisie + ajoute la bascule voir/masquer. */
  password?: boolean;
  /** Message d'erreur sous le champ (bordure + texte rouges). Prioritaire sur `helper`. */
  error?: string | null;
  /** Aide discrète sous le champ (grise), affichée en l'absence d'erreur. */
  helper?: string;
}

/**
 * Champ de saisie des écrans d'auth : pilule blanche, icône d'amorce, bordure
 * qui réagit au focus / à l'erreur, bascule voir/masquer pour les mots de passe,
 * et ligne d'aide ou d'erreur en dessous.
 * `forwardRef` pour permettre l'enchaînement clavier (focus du champ suivant).
 */
export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(function AuthTextField(
  { icon: Icon, password = false, error, helper, onFocus, onBlur, ...inputProps },
  ref,
) {
  const { t } = useTranslation('auth');
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(password);
  const hasError = Boolean(error);
  const borderColor = hasError ? colors.danger : focused ? colors.pine : colors.border;
  const accent = hasError ? colors.danger : focused ? colors.pine : colors.muted;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.white,
          paddingHorizontal: 18,
        }}
      >
        {Icon ? <Icon size={18} color={accent} strokeWidth={2.2} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.pine}
          {...inputProps}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            paddingVertical: 15,
            fontFamily: fontFamily('regular'),
            fontSize: 15,
            color: colors.ink,
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('a11y.showPassword') : t('a11y.hidePassword')}
          >
            {hidden ? (
              <EyeOff size={18} color={colors.muted} />
            ) : (
              <Eye size={18} color={colors.pine} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error || helper ? (
        <AppText
          variant="caption"
          color={hasError ? colors.danger : colors.muted}
          style={{ marginTop: 6, marginHorizontal: 18 }}
        >
          {error || helper}
        </AppText>
      ) : null}
    </View>
  );
});
