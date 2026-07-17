import type { Locale } from '@baraka/shared';

/**
 * Catalogue localisé des notifications (push + inbox). Le corps peut contenir des
 * placeholders `{number}` / `{store}` remplacés à l'exécution. La locale de destination
 * vient de `users.locale`. Traductions en/ar relues par des locuteurs natifs.
 */
export type NotifKey =
  | 'order_reserved'
  | 'payment_confirmed'
  | 'order_cancelled_store'
  | 'pickup_reminder'
  | 'referral_reward'
  | 'favorite_new_bags'
  | 'review_request';

interface Entry {
  title: string;
  body: string;
}

const MESSAGES: Record<NotifKey, Record<Locale, Entry>> = {
  order_reserved: {
    fr: {
      title: 'Panier réservé',
      body: 'Ta commande {number} est réservée. Présente ton code au retrait.',
    },
    en: {
      title: 'Bag reserved',
      body: 'Your order {number} is reserved. Show your code at pickup.',
    },
    ar: { title: 'تم حجز السلة', body: 'طلبك {number} محجوز. قدّم رمزك وقت الاستلام.' },
  },
  payment_confirmed: {
    fr: { title: 'Paiement confirmé', body: 'Ta commande {number} est réservée.' },
    en: { title: 'Payment confirmed', body: 'Your order {number} is reserved.' },
    ar: { title: 'تم تأكيد الدفع', body: 'طلبك {number} محجوز.' },
  },
  order_cancelled_store: {
    fr: {
      title: 'Commande annulée',
      body: 'Le commerçant a annulé ta commande. Tu seras remboursé le cas échéant.',
    },
    en: {
      title: 'Order cancelled',
      body: "The merchant cancelled your order. You'll be refunded if applicable.",
    },
    ar: { title: 'تم إلغاء الطلب', body: 'التاجر ألغى طلبك. باش يتردّلك فلوسك إذا لزم.' },
  },
  pickup_reminder: {
    fr: { title: 'Rappel de retrait', body: 'Récupère ton panier chez {store} bientôt !' },
    en: { title: 'Pickup reminder', body: 'Pick up your bag at {store} soon!' },
    ar: { title: 'تذكير بالاستلام', body: 'استلم سلتك من {store} قريب!' },
  },
  referral_reward: {
    fr: {
      title: 'Parrainage récompensé 🎉',
      body: 'Ton filleul a récupéré son premier panier : 5,000 DT de crédit t’ont été offerts !',
    },
    en: {
      title: 'Referral rewarded 🎉',
      body: "Your friend picked up their first bag: you've earned 5,000 DT in credit!",
    },
    ar: {
      title: 'مكافأة الإحالة 🎉',
      body: 'صاحبك اللي دعيتو استلم أول سلة متاعو: تحصّلت على رصيد 5,000 DT هدية!',
    },
  },
  favorite_new_bags: {
    fr: { title: 'Nouveaux paniers 🥖', body: '{store} a des paniers à sauver aujourd’hui !' },
    en: { title: 'New bags 🥖', body: '{store} has bags to save today!' },
    ar: { title: 'سلال جديدة 🥖', body: '{store} عندو سلال باش تنقذها اليوم!' },
  },
  review_request: {
    fr: { title: 'Ton avis compte ⭐', body: 'Comment était ton panier chez {store} ?' },
    en: { title: 'Your review matters ⭐', body: 'How was your bag at {store}?' },
    ar: { title: 'رأيك يهمّنا ⭐', body: 'كيفاش كانت سلتك من {store}؟' },
  },
};

/** Rend le titre + corps d'une notification dans la locale voulue (repli sur le français). */
export function renderNotif(
  key: NotifKey,
  locale: Locale,
  params: Record<string, string> = {},
): { title: string; body: string } {
  const entry = MESSAGES[key][locale] ?? MESSAGES[key].fr;
  const body = entry.body.replace(/\{(\w+)\}/g, (_m, k: string) => params[k] ?? '');
  return { title: entry.title, body };
}
