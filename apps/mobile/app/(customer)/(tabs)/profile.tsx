import { useState } from 'react';
import { View, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Globe, Store, LogOut, Trash2, X, UserCircle } from 'lucide-react-native';
import { formatMoney, money, formatCo2e, type Currency } from '@baraka/shared';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconButton } from '@/components/ui/IconButton';
import { StoreAvatar } from '@/components/StoreAvatar';
import { SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/store/session';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { colors, radii } from '@/lib/theme';

export default function Profile() {
  const { t } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const router = useRouter();
  const { bcp47 } = useLocale();
  const { user, signOut, setMode } = useSession();
  const isAuth = useSession((s) => s.isAuthenticated);
  const [langOpen, setLangOpen] = useState(false);

  const { data: impact } = useQuery({ queryKey: ['impact'], queryFn: api.impact, enabled: isAuth });
  const { data: referral } = useQuery({
    queryKey: ['referral'],
    queryFn: api.referrals,
    enabled: isAuth,
  });

  const co2 = impact ? formatCo2e(impact.co2eSavedG) : null;

  function confirmDelete() {
    Alert.alert(ta('deleteAccount.title'), ta('deleteAccount.warning'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: ta('deleteAccount.confirm'),
        style: 'destructive',
        onPress: async () => {
          // Ne déconnecter QUE si la suppression a réellement abouti : sinon (zone blanche)
          // l'utilisateur croirait son compte supprimé — RGPD — alors qu'il existe toujours.
          try {
            await api.deleteAccount();
            signOut();
            router.replace('/(auth)/welcome');
          } catch (e) {
            Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <StoreAvatar name={user?.name ?? 'Baraka'} size={56} />
          <View style={{ flex: 1 }}>
            <AppText variant="display">{user?.name ?? t('appName')}</AppText>
            {user?.email ? (
              <AppText variant="body" tone="muted">
                {user.email}
              </AppText>
            ) : null}
          </View>
        </View>

        {!isAuth ? (
          /* État invité : CTA connexion / inscription (browse-first). */
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radii.card,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <UserCircle size={36} color={colors.pine} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <AppText variant="title">{ta('guest.signInTitle')}</AppText>
                <AppText variant="caption" tone="muted">
                  {ta('guest.signInText')}
                </AppText>
              </View>
            </View>
            <PrimaryButton
              label={ta('login.submit')}
              onPress={() => router.push('/(auth)/login')}
            />
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              hitSlop={8}
              style={{ paddingVertical: 6 }}
            >
              <AppText variant="label" tone="muted" style={{ textAlign: 'center' }}>
                {ta('login.noAccount')}{' '}
                <AppText variant="label" tone="pine">
                  {ta('register.submit')}
                </AppText>
              </AppText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Bande impact */}
            <View style={{ backgroundColor: colors.pine, borderRadius: radii.card, padding: 18 }}>
              <AppText variant="label" color={colors.cream}>
                {t('profile.impact.title')}
              </AppText>
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                {[
                  { value: String(impact?.bagsSaved ?? 0), label: t('profile.impact.bags') },
                  { value: co2 ? `${co2.value}${co2.unit}` : '0g', label: t('profile.impact.co2') },
                  {
                    value: impact
                      ? formatMoney(
                          money(
                            impact.moneySaved.amountMinor,
                            impact.moneySaved.currency as Currency,
                          ),
                          bcp47,
                        )
                      : '—',
                    label: t('profile.impact.saved'),
                  },
                ].map((s, i) => (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <AppText weight="extrabold" color={colors.yellow} style={{ fontSize: 20 }}>
                      {s.value}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={colors.cream}
                      style={{ textAlign: 'center', marginTop: 2 }}
                    >
                      {s.label}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            {/* Parrainage */}
            {referral ? (
              <View
                style={{ backgroundColor: colors.white, borderRadius: radii.card, padding: 16 }}
              >
                <AppText variant="caption" tone="muted">
                  {t('profile.referral.title')}
                </AppText>
                <AppText variant="displayXl" style={{ letterSpacing: 3, marginTop: 4 }}>
                  {referral.code}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {t('profile.referral.stats', {
                    invited: referral.invited,
                    rewarded: referral.rewarded,
                  })}
                </AppText>
              </View>
            ) : null}

            {/* Réglages */}
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: radii.card,
                overflow: 'hidden',
              }}
            >
              <SettingsRow
                icon={ShoppingBag}
                label={t('profile.rows.orders')}
                onPress={() => router.push('/(customer)/(tabs)/orders')}
              />
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 60 }} />
              {user?.isMerchant ? (
                <>
                  <SettingsRow
                    icon={Store}
                    label={t('profile.rows.merchant')}
                    onPress={() => {
                      setMode('merchant');
                      router.replace('/(merchant)/(tabs)');
                    }}
                  />
                  <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 60 }} />
                </>
              ) : null}
              <SettingsRow
                icon={LogOut}
                label={t('profile.rows.signOut')}
                onPress={() => {
                  signOut();
                  router.replace('/(customer)/(tabs)');
                }}
              />
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 60 }} />
              <SettingsRow
                icon={Trash2}
                label={t('profile.rows.delete')}
                tone="danger"
                onPress={confirmDelete}
              />
            </View>
          </>
        )}

        {/* Langue : toujours accessible, connecté ou non. */}
        <View
          style={{ backgroundColor: colors.white, borderRadius: radii.card, overflow: 'hidden' }}
        >
          <SettingsRow
            icon={Globe}
            label={t('profile.rows.language')}
            onPress={() => setLangOpen(true)}
          />
        </View>
      </ScrollView>

      {/* Modale de langue */}
      <Modal
        visible={langOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay }}
          onPress={() => setLangOpen(false)}
        />
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: colors.cream,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <View style={{ padding: 20, gap: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <AppText variant="display">{t('language.title')}</AppText>
              <IconButton icon={X} tone="ghost" size={32} onPress={() => setLangOpen(false)} />
            </View>
            <LanguageSwitcher />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
