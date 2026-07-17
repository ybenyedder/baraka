'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MerchantShell } from '@/components/MerchantShell';
import {
  Panel,
  Feedback,
  inputCls,
  StatusBadge,
  ORDER_STATUS_LABELS,
  formatDayFr,
  formatTimeFr,
} from '@/components/merchant/ui';
import { webApi, subscribeStoreOrders, type WebStore } from '@/lib/client';
import { Button } from '@/components/ui/Button';
import {
  formatMoney,
  money,
  type Currency,
  type MerchantOrder,
  type OrderStatus,
} from '@baraka/shared';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces au retrait',
  konnect: 'Konnect (en ligne)',
  stripe: 'Carte (en ligne)',
};

export default function MerchantOrders() {
  const [stores, setStores] = useState<WebStore[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [scope, setScope] = useState<'today' | 'all'>('today');
  const [status, setStatus] = useState<string>('');
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  // Rafraîchissement déclenché par SSE : on garde la dernière requête dans une ref.
  const reloadRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const o = await webApi.merchantOrders({
        storeId: storeId || undefined,
        scope,
        status: (status || undefined) as OrderStatus | undefined,
        limit: 100,
      });
      setOrders(o.items);
    } finally {
      setLoading(false);
    }
  }, [storeId, scope, status]);

  useEffect(() => {
    reloadRef.current = () => void load();
    void load();
  }, [load]);

  useEffect(() => {
    void webApi.myStores().then((s) => setStores(s.items));
  }, []);

  // Flux temps réel : un abonnement par boutique concernée.
  useEffect(() => {
    const targets = storeId ? [storeId] : stores.map((s) => s.id);
    if (targets.length === 0) return;
    setLive(true);
    const unsubs = targets.map((id) => subscribeStoreOrders(id, () => reloadRef.current()));
    return () => {
      setLive(false);
      unsubs.forEach((u) => u());
    };
  }, [storeId, stores]);

  return (
    <MerchantShell title="Commandes">
      <ValidateCard onValidated={() => reloadRef.current()} />

      <Panel
        className="mt-6"
        title="Réservations"
        action={
          live ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0e8a76]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0e8a76] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0e8a76]" />
              </span>
              En direct
            </span>
          ) : null
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-pine/5 p-1">
            {(
              [
                ['today', "Aujourd'hui"],
                ['all', 'Historique'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  scope === key ? 'bg-pine text-cream' : 'text-pine/70 hover:text-pine'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className={`${inputCls} w-auto`}
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            aria-label="Filtrer par boutique"
          >
            <option value="">Toutes les boutiques</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={`${inputCls} w-auto`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-black/50">Chargement…</p>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-black/50">
            {scope === 'today'
              ? "Aucune commande pour aujourd'hui — elles apparaîtront ici en temps réel."
              : 'Aucune commande ne correspond à ces filtres.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-black/45">
                  <th className="py-2 pr-3 font-semibold">Commande</th>
                  <th className="py-2 pr-3 font-semibold">Client</th>
                  <th className="py-2 pr-3 font-semibold">Panier</th>
                  <th className="py-2 pr-3 font-semibold">Boutique</th>
                  <th className="py-2 pr-3 font-semibold">Total</th>
                  <th className="py-2 pr-3 font-semibold">Paiement</th>
                  <th className="py-2 pr-3 font-semibold">Retrait</th>
                  <th className="py-2 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-pine">{o.number}</p>
                      <p className="text-xs text-black/45">
                        {formatDayFr(o.createdAt)} {formatTimeFr(o.createdAt)}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 text-pine">{o.customerName ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      {o.bagTitle}
                      {o.quantity > 1 ? (
                        <span className="font-semibold"> ×{o.quantity}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-black/60">{o.storeName}</td>
                    <td className="py-2.5 pr-3 font-semibold text-pine">
                      {formatMoney(money(o.totalMinor, o.currency as Currency))}
                    </td>
                    <td className="py-2.5 pr-3 text-black/60">
                      {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                    </td>
                    <td className="py-2.5 pr-3 text-black/60">
                      {o.pickupStartAt && o.pickupEndAt
                        ? `${formatTimeFr(o.pickupStartAt)}–${formatTimeFr(o.pickupEndAt)}`
                        : '—'}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={o.status} labels={ORDER_STATUS_LABELS} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </MerchantShell>
  );
}

/** Validation d'un retrait : le client présente son code à 6 chiffres au comptoir. */
function ValidateCard({ onValidated }: { onValidated: () => void }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await webApi.validatePickup(code);
      setMsg({ text: `Retrait validé (code ${code}). Bon appétit à ton client !`, ok: true });
      setCode('');
      onValidated();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Code invalide.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Valider un retrait">
      <p className="text-sm text-black/55">
        Saisis le code à 6 chiffres présenté par le client. La commande passe en « Retirée » et,
        pour un paiement en espèces, encaisse le montant.
      </p>
      <form onSubmit={submit} className="mt-3 flex max-w-md gap-3">
        <input
          className="flex-1 rounded-lg border border-pine/15 px-4 py-3 text-center font-mono text-xl tracking-[6px]"
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy ? '…' : 'Valider'}
        </Button>
      </form>
      <Feedback msg={msg} />
    </Panel>
  );
}
