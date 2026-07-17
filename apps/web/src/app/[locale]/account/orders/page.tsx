'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { Order } from '@baraka/shared';
import { formatMoney, money, STORE_TIME_ZONE, type Currency } from '@baraka/shared';
import { LOCALE_BCP47, type Locale } from '@baraka/i18n/config';
import { getToken, webApi } from '@/lib/client';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui/Button';

const OPEN_STATUSES = new Set(['pending_payment', 'reserved']);

/** Espace client : commandes à venir (code retrait) et historique. */
export default function OrdersPage() {
  const t = useTranslations('orders');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items } = await webApi.myOrders();
      setOrders(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=${encodeURIComponent('/account/orders')}`);
      return;
    }
    void load();
  }, [router, load]);

  const upcoming = (orders ?? []).filter((o) => OPEN_STATUSES.has(o.status));
  const history = (orders ?? []).filter((o) => !OPEN_STATUSES.has(o.status));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-2xl font-extrabold text-pine sm:text-3xl">{t('title')}</h1>

        {error ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {orders === null && !error ? (
          <p className="mt-8 text-black/50">…</p>
        ) : (
          <>
            <h2 className="mb-3 mt-8 font-display text-lg font-extrabold text-pine">
              {t('upcoming')}
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-black/50">
                <p>{t('empty.upcoming')}</p>
                <Button href="/browse" className="mt-4">
                  {t('discoverCta')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((o) => (
                  <OrderRow key={o.id} order={o} locale={locale} onChanged={load} showCode />
                ))}
              </ul>
            )}

            {history.length > 0 ? (
              <>
                <h2 className="mb-3 mt-10 font-display text-lg font-extrabold text-pine">
                  {t('history')}
                </h2>
                <ul className="space-y-4">
                  {history.map((o) => (
                    <OrderRow key={o.id} order={o} locale={locale} onChanged={load} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function OrderRow({
  order,
  locale,
  onChanged,
  showCode = false,
}: {
  order: Order;
  locale: Locale;
  onChanged: () => Promise<void>;
  showCode?: boolean;
}) {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const bcp47 = LOCALE_BCP47[locale];
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Créneau de retrait en heure de Tunis (indépendant du fuseau du navigateur du client).
  const day = new Intl.DateTimeFormat(bcp47, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: STORE_TIME_ZONE,
  });
  const time = new Intl.DateTimeFormat(bcp47, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: STORE_TIME_ZONE,
  });
  const start = new Date(order.pickupStartAt);
  const end = new Date(order.pickupEndAt);
  const total = formatMoney(
    money(order.total.amountMinor, order.total.currency as Currency),
    bcp47,
  );
  const cancellable = order.status === 'reserved' || order.status === 'pending_payment';

  async function cancel() {
    setCancelling(true);
    setError(null);
    try {
      await webApi.cancelOrder(order.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-extrabold text-pine">{order.storeName}</p>
        <span className="rounded-full bg-cream-deep px-3 py-1 text-xs font-bold text-pine">
          {t(`status.${order.status}`)}
        </span>
      </div>
      <p className="mt-1 text-sm text-black/60">
        {order.bagTitle} × {order.quantity} — <strong>{total}</strong>
      </p>
      <p className="text-sm text-black/50">
        {day.format(start)} · {time.format(start)}–{time.format(end)}
      </p>

      {showCode && order.pickupCode ? (
        <div className="mt-3 rounded-xl bg-pine p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-cream/70">{t('pickupCode')}</p>
          <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em] text-yellow">
            {order.pickupCode}
          </p>
        </div>
      ) : null}

      {cancellable ? (
        <div className="mt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={cancel} disabled={cancelling}>
                {cancelling ? '…' : t('cancel.confirm')}
              </Button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-2 text-sm font-semibold text-black/50 hover:text-pine"
              >
                {tc('actions.back')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm font-semibold text-red-600 underline-offset-2 hover:underline"
            >
              {t('cancel.title')}
            </button>
          )}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}
