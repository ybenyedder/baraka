import { useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { api } from '@/lib/api';
import { colors, fontFamily, radii } from '@/lib/theme';

export default function Review() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation('orders');
  const { t: tc } = useTranslation('common');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (rating < 1) {
      Alert.alert('⭐', t('review.rateHint'));
      return;
    }
    setLoading(true);
    try {
      await api.createReview(String(orderId), {
        ratingOverall: rating,
        comment: comment || undefined,
      });
      // Invalide le détail (masque le CTA « Laisser un avis ») pour éviter un second envoi → 500.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['order', orderId] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
      ]);
      router.back();
    } catch (e) {
      Alert.alert(tc('errorGeneric'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: 12 }}>
        <AppText variant="displayXl">{t('detail.review')}</AppText>
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 28 }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
              <Star
                size={40}
                color={colors.yellow}
                fill={n <= rating ? colors.yellow : 'transparent'}
                strokeWidth={n <= rating ? 0 : 2}
              />
            </Pressable>
          ))}
        </View>
        <TextInput
          style={{
            minHeight: 110,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.white,
            padding: 16,
            textAlignVertical: 'top',
            fontFamily: fontFamily('regular'),
            fontSize: 15,
            color: colors.ink,
          }}
          placeholder={t('review.commentPlaceholder')}
          placeholderTextColor={colors.muted}
          multiline
          value={comment}
          onChangeText={setComment}
        />
        <PrimaryButton
          label={t('detail.review')}
          onPress={submit}
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </View>
    </Screen>
  );
}
