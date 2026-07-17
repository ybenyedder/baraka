import { useRef, useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from 'lucide-react-native';
import { AuthScreen } from '@/components/AuthScreen';
import { AuthTextField } from '@/components/ui/AuthTextField';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { api } from '@/lib/api';
import { useSession } from '@/store/session';
import { registerForPush } from '@/lib/push';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = 'email' | 'password';
type Errors = Partial<Record<Field, string>>;

export default function Login() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  /** Setter qui efface l'erreur du champ dès que l'utilisateur corrige. */
  const bind = (setter: (v: string) => void, key: Field) => (v: string) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  function validate(): Errors {
    const next: Errors = {};
    if (!email.trim()) next.email = t('errors.required');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('errors.invalidEmail');
    if (!password) next.password = t('errors.required');
    return next;
  }

  async function submit() {
    if (loading) return;
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      (found.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.login(email.trim(), password);
      setSession(token, user);
      void registerForPush();
      router.replace('/(customer)/(tabs)');
    } catch (e) {
      Alert.alert(
        tc('errorTitle', { defaultValue: 'Erreur' }),
        e instanceof Error ? e.message : 'Connexion impossible',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <AppText variant="displayXl">{t('login.title')}</AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: 4, marginBottom: 24 }}>
        {tc('tagline')}
      </AppText>

      <View style={{ gap: 14 }}>
        <AuthTextField
          ref={emailRef}
          icon={Mail}
          placeholder={t('login.email')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={bind(setEmail, 'email')}
          error={errors.email}
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <AuthTextField
          ref={passwordRef}
          icon={Lock}
          password
          placeholder={t('login.password')}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          value={password}
          onChangeText={bind(setPassword, 'password')}
          error={errors.password}
          onSubmitEditing={submit}
        />
        <PrimaryButton
          label={t('login.submit')}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </View>

      <Pressable
        onPress={() => router.replace('/(auth)/register')}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 24,
        }}
      >
        <AppText variant="body" tone="muted">
          {t('login.noAccount')}
        </AppText>
        <AppText variant="bodyBold" tone="pine">
          {t('register.submit')}
        </AppText>
      </Pressable>
    </AuthScreen>
  );
}
