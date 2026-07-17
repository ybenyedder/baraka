'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { MerchantShell } from '@/components/MerchantShell';
import { SalesChart } from '@/components/merchant/SalesChart';
import {
  Field,
  Panel,
  Feedback,
  inputCls,
  StatusBadge,
  ORDER_STATUS_LABELS,
  MERCHANT_STATUS_LABELS,
  formatTimeFr,
} from '@/components/merchant/ui';
import { webApi, type WebMerchantProfile, type WebStore } from '@/lib/client';
import { Stat } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import {
  formatMoney,
  money,
  type Currency,
  type MerchantStats,
  type MerchantAnalytics,
  type MerchantOrder,
} from '@baraka/shared';

export default function MerchantDashboard() {
  const [merchant, setMerchant] = useState<WebMerchantProfile | null>(null);
  const [notMerchant, setNotMerchant] = useState(false);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const [stores, setStores] = useState<WebStore[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await webApi.myMerchant();
      setMerchant(m);
      setNotMerchant(false);
      if (m.status === 'approved') {
        const [s, a, st, o] = await Promise.all([
          webApi.merchantStats(),
          webApi.merchantAnalytics(30),
          webApi.myStores(),
          webApi.merchantOrders({ scope: 'today', limit: 8 }),
        ]);
        setStats(s);
        setAnalytics(a);
        setStores(st.items);
        setOrders(o.items);
      }
    } catch {
      setNotMerchant(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cur = (analytics?.currency ?? 'TND') as Currency;

  return (
    <MerchantShell title="Vue d'ensemble">
      {loading ? (
        <p className="text-black/50">Chargement…</p>
      ) : notMerchant ? (
        <ApplyForm onDone={load} />
      ) : merchant && merchant.status !== 'approved' ? (
        <PendingNotice merchant={merchant} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="CA (30 derniers jours)"
              value={analytics ? formatMoney(money(analytics.totals.revenueMinor, cur)) : '—'}
            />
            <Stat label="Paniers sauvés (30 j)" value={String(analytics?.totals.bagsSold ?? 0)} />
            <Stat
              label="Commandes retirées (30 j)"
              value={String(analytics?.totals.ordersCount ?? 0)}
            />
            <Stat
              label="Note moyenne"
              value={stats?.ratingAvg ? `${stats.ratingAvg.toFixed(1)} / 5` : '—'}
            />
          </div>

          {analytics ? (
            <Panel title="Chiffre d'affaires quotidien (30 jours)" className="mt-6">
              <SalesChart series={analytics.series} currency={analytics.currency} />
              {analytics.totals.cancelledCount + analytics.totals.noShowCount > 0 ? (
                <p className="mt-3 text-sm text-black/50">
                  Sur la période : {analytics.totals.cancelledCount} annulation
                  {analytics.totals.cancelledCount > 1 ? 's' : ''} · {analytics.totals.noShowCount}{' '}
                  non-retrait
                  {analytics.totals.noShowCount > 1 ? 's' : ''}.
                </p>
              ) : null}
            </Panel>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel
              title="Commandes du jour"
              action={
                <Link href="/merchant/orders" className="text-sm font-semibold text-pine underline">
                  Tout voir
                </Link>
              }
            >
              {orders.length === 0 ? (
                <p className="text-sm text-black/50">Aucune commande pour aujourd'hui.</p>
              ) : (
                <ul className="divide-y divide-black/[0.06]">
                  {orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-pine">
                          {o.customerName ?? 'Client'} · {o.bagTitle}
                        </p>
                        <p className="text-xs text-black/50">
                          {o.storeName} · {o.quantity}× ·{' '}
                          {formatMoney(money(o.totalMinor, o.currency as Currency))} ·{' '}
                          {formatTimeFr(o.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={o.status} labels={ORDER_STATUS_LABELS} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Mes boutiques"
              action={
                <Link href="/merchant/stores" className="text-sm font-semibold text-pine underline">
                  Gérer
                </Link>
              }
            >
              {stores.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm text-black/50">
                    Aucune boutique pour l'instant — crée la première pour commencer à vendre.
                  </p>
                  <Button href="/merchant/stores" className="mt-4">
                    Créer ma boutique
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-black/[0.06]">
                  {(analytics?.byStore ?? []).map((s) => (
                    <li key={s.storeId} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-pine">{s.storeName}</p>
                      <p className="shrink-0 text-sm text-black/60">
                        {formatMoney(money(s.revenueMinor, cur))} · {s.bagsSold} paniers (30 j)
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </MerchantShell>
  );
}

/** Statut non approuvé : contexte + rappel de la suite. */
function PendingNotice({ merchant }: { merchant: WebMerchantProfile }) {
  return (
    <Panel className="mx-auto max-w-lg text-center">
      <p className="text-lg font-semibold text-pine">{merchant.legalName}</p>
      <div className="mt-3 flex justify-center">
        <StatusBadge status={merchant.status} labels={MERCHANT_STATUS_LABELS} />
      </div>
      <p className="mt-4 text-black/60">
        {merchant.status === 'pending'
          ? "Ton compte est en cours de validation par notre équipe. Tu pourras créer tes boutiques et publier tes paniers dès qu'il sera approuvé."
          : merchant.status === 'rejected'
            ? "Ta candidature n'a pas été retenue. Contacte-nous si tu penses qu'il s'agit d'une erreur."
            : 'Ton compte est suspendu. Contacte le support pour en savoir plus.'}
      </p>
    </Panel>
  );
}

/** Candidature commerçant (utilisateur connecté sans compte business). */
function ApplyForm({ onDone }: { onDone: () => void }) {
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await webApi.applyMerchant({
        legalName,
        contactEmail,
        contactPhone: contactPhone || undefined,
        taxId: taxId || undefined,
      });
      onDone();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec de la candidature.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">
      <h2 className="font-display text-xl font-extrabold text-pine">
        Devenir commerçant partenaire
      </h2>
      <p className="mt-2 text-sm text-black/55">
        Renseigne ton entreprise : notre équipe valide chaque candidature avant l'ouverture de
        l'espace de vente.
      </p>
      <div className="mt-5 grid gap-4">
        <Field label="Raison sociale">
          <input
            className={inputCls}
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
            minLength={2}
          />
        </Field>
        <Field label="E-mail de contact">
          <input
            className={inputCls}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Téléphone (facultatif)">
          <input
            className={inputCls}
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </Field>
        <Field label="Matricule fiscal (facultatif)">
          <input className={inputCls} value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </Field>
      </div>
      <Feedback msg={msg} />
      <Button type="submit" className="mt-6 w-full" disabled={busy}>
        {busy ? 'Envoi…' : 'Envoyer ma candidature'}
      </Button>
    </form>
  );
}
