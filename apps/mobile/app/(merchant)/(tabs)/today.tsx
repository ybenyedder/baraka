import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { api } from '@/lib/api';

/** Vue « aujourd'hui » : validation d'un retrait par saisie du code à 6 chiffres. */
export default function Today() {
  const { t } = useTranslation('merchant');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function validate() {
    if (code.length !== 6) {
      Alert.alert(t('validate.title'), t('validate.invalid'));
      return;
    }
    setBusy(true);
    try {
      await api.validatePickup(code);
      Alert.alert(t('validate.title'), t('validate.success'));
      setCode('');
    } catch (e) {
      Alert.alert(t('validate.title'), e instanceof Error ? e.message : t('validate.invalid'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text className="mb-4 text-2xl font-bold text-brand-ink">{t('today.title')}</Text>

      <View className="rounded-2xl bg-white p-5 shadow-sm">
        <Text className="mb-2 font-semibold text-brand-ink">{t('validate.title')}</Text>
        <TextInput
          className="rounded-xl border border-black/10 px-4 py-3 text-center text-2xl tracking-[8px]"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <Pressable
          onPress={validate}
          disabled={busy}
          className="mt-3 items-center rounded-xl bg-brand py-3"
        >
          <Text className="font-semibold text-white">{t('today.validate')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
