'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { BagCard } from '@baraka/shared';
import { formatMoney, money, STORE_TIME_ZONE, type Currency } from '@baraka/shared';
import { LOCALE_BCP47, type Locale } from '@baraka/i18n/config';
import { getToken, webApi, type WebOrderCreated } from '@/lib/client';
import { Button } from '@/components/ui/Button';

/**
 * Liste interactive des paniers d'une boutique : quantité + réservation (paiement
 * au retrait). Redirige vers la connexion si le visiteur n'a pas de session.
 */
export function ReserveBags({
  bags,
  slug,
  locale,
}: {
  bags: BagCard[];
  slug: string;
  locale: Locale;
}) {
  const td = useTranslations('discovery');
  const router = useRouter();
  const bcp47 = LOCALE_BCP47[locale];
  const [done, setDone] = useState<WebOrderCreated | null>(null);

  if (done) {
    return <Confirmation order={done} bcp47={bcp47} />;
  }

  if (bags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-black/50">
        {td('empty')}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {bags.map((bag) => (
        <BagRow
          key={bag.bagInstanceId}
          bag={bag}
          bcp47={bcp47}
          onReserved={setDone}
          onLoginNeeded={() => router.push(`/login?next=${encodeURIComponent(`/stores/${slug}`)}`)}
        />
      ))}
    </ul>
  );
}

function BagRow({
  bag,
  bcp47,
  onReserved,
  onLoginNeeded,
}: {
  bag: BagCard;
  bcp47: string;
  onReserved: (order: WebOrderCreated) => void;
  onLoginNeeded: () => void;
}) {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.max(1, Math.min(10, bag.quantityAvailable));
  const currency = bag.price.currency as Currency;
  const unit = money(bag.price.amountMinor, currency);
  const total = money(bag.price.amountMinor * qty, currency);
  // Créneau affiché en heure de Tunis (24h), indépendamment du fuseau du navigateur.
  const time = new Intl.DateTimeFormat(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: STORE_TIME_ZONE,
  });
  const day = new Intl.DateTimeFormat(bcp47, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: STORE_TIME_ZONE,
  });
  const start = new Date(bag.pickupStartAt);
  const end = new Date(bag.pickupEndAt);

  async function reserve() {
    if (!getToken()) {
      onLoginNeeded();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const order = await webApi.createOrder({
        bagInstanceId: bag.bagInstanceId,
        quantity: qty,
        paymentMethod: 'cash',
      });
      onReserved(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="rounded-2xl border border-black/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-pine">{bag.title}</span>
        <span className="shrink-0 rounded-full bg-yellow px-3 py-1 font-bold text-pine">
          {formatMoney(unit, bcp47)}
        </span>
      </div>
      <p className="mt-1 text-sm text-black/50">
        {day.format(start)} · {time.format(start)}–{time.format(end)}
      </p>
      <p className="text-sm text-black/50">{tc('browse.left', { count: bag.quantityAvailable })}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-pine/20">
          <button
            type="button"
            aria-label="-"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1 || loading}
            className="flex size-11 items-center justify-center rounded-full text-xl font-bold text-pine disabled:opacity-30"
          >
            −
          </button>
          <span className="min-w-8 text-center font-bold text-pine" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="+"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty || loading}
            className="flex size-11 items-center justify-center rounded-full text-xl font-bold text-pine disabled:opacity-30"
          >
            +
          </button>
        </div>
        <Button onClick={reserve} disabled={loading} className="grow sm:grow-0">
          {loading ? '…' : `${tc('actions.reserve')} · ${formatMoney(total, bcp47)}`}
        </Button>
      </div>
      <p className="mt-2 text-xs text-black/50">{t('checkout.payAtPickup')}</p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function Confirmation({ order, bcp47 }: { order: WebOrderCreated; bcp47: string }) {
  const t = useTranslations('orders');
  const total = formatMoney(
    money(order.total.amountMinor, order.total.currency as Currency),
    bcp47,
  );
  return (
    <div className="rounded-2xl bg-pine p-6 text-center text-cream">
      <p className="font-display text-xl font-extrabold">{t('reserveSuccess')}</p>
      {order.pickupCode ? (
        <>
          <p className="mt-4 text-sm uppercase tracking-wide text-cream/70">{t('pickupCode')}</p>
          <p className="mt-1 font-display text-5xl font-extrabold tracking-[0.3em] text-yellow">
            {order.pickupCode}
          </p>
        </>
      ) : null}
      <p className="mt-4 text-sm text-cream/80">
        {t('checkout.total')} : <strong>{total}</strong> — {t('checkout.payAtPickup')}
      </p>
      <div className="mt-6">
        <Button href="/account/orders" variant="primary">
          {t('detail.backToList')}
        </Button>
      </div>
    </div>
  );
}
