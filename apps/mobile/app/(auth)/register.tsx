import { useRef, useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, Ticket } from 'lucide-react-native';
import { AuthScreen } from '@/components/AuthScreen';
import { AuthTextField } from '@/components/ui/AuthTextField';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { api } from '@/lib/api';
import { useSession } from '@/store/session';
import { detectDeviceLocale } from '@/lib/i18n';
import { registerForPush } from '@/lib/push';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = 'name' | 'email' | 'password' | 'referral';
type Errors = Partial<Record<Field, string>>;

export default function Register() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  /** Setter qui efface l'erreur du champ dès que l'utilisateur corrige. */
  const bind = (setter: (v: string) => void, key: Field) => (v: string) => {
    setter(v);
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = t('errors.required');
    if (!email.trim()) next.email = t('errors.required');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('errors.invalidEmail');
    if (!password) next.password = t('errors.required');
    else if (password.length < 8) next.password = t('register.passwordHint');
    if (showReferral) {
      const rc = referral.trim();
      if (rc.length > 0 && (rc.length < 4 || rc.length > 16))
        next.referral = t('errors.invalidReferral');
    }
    return next;
  }

  async function submit() {
    if (loading) return;
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // Focus le premier champ fautif pour guider la correction.
      const order: Field[] = ['name', 'email', 'password', 'referral'];
      const refs = { name: nameRef, email: emailRef, password: passwordRef, referral: referralRef };
      refs[order.find((f) => found[f])!]?.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const rc = referral.trim();
      const { token, user } = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        locale: detectDeviceLocale(),
        ...(rc.length >= 4 ? { referralCode: rc } : {}),
      });
      setSession(token, user);
      void registerForPush();
      router.replace('/(customer)/(tabs)');
    } catch (e) {
      Alert.alert(
        tc('errorTitle', { defaultValue: 'Erreur' }),
        e instanceof Error ? e.message : 'Inscription impossible',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen>
      <AppText variant="displayXl">{t('register.title')}</AppText>
      <AppText variant="body" tone="muted" style={{ marginTop: 4, marginBottom: 24 }}>
        {tc('tagline')}
      </AppText>

      <View style={{ gap: 14 }}>
        <AuthTextField
          ref={nameRef}
          icon={User}
          placeholder={t('register.name')}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          value={name}
          onChangeText={bind(setName, 'name')}
          error={errors.name}
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
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
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType={showReferral ? 'next' : 'go'}
          value={password}
          onChangeText={bind(setPassword, 'password')}
          error={errors.password}
          helper={t('register.passwordHint')}
          onSubmitEditing={() => (showReferral ? referralRef.current?.focus() : submit())}
          submitBehavior={showReferral ? 'submit' : 'blurAndSubmit'}
        />

        {showReferral ? (
          <AuthTextField
            ref={referralRef}
            icon={Ticket}
            placeholder={t('register.referralCode')}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            value={referral}
            onChangeText={bind(setReferral, 'referral')}
            error={errors.referral}
            onSubmitEditing={submit}
          />
        ) : (
          <Pressable
            onPress={() => {
              setShowReferral(true);
              setTimeout(() => referralRef.current?.focus(), 50);
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', paddingVertical: 2 }}
          >
            <AppText variant="bodyBold" tone="pine">
              {t('register.addReferral')}
            </AppText>
          </Pressable>
        )}

        <PrimaryButton
          label={t('register.submit')}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </View>

      <Pressable
        onPress={() => router.replace('/(auth)/login')}
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
          {t('register.haveAccount')}
        </AppText>
        <AppText variant="bodyBold" tone="pine">
          {t('login.submit')}
        </AppText>
      </Pressable>
    </AuthScreen>
  );
}
