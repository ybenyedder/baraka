'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { MerchantShell } from '@/components/MerchantShell';
import { Panel, StatusBadge, PAYOUT_STATUS_LABELS } from '@/components/merchant/ui';
import { webApi, type WebPayout, type WebMerchantProfile } from '@/lib/client';
import { formatMoney, money, type Currency } from '@baraka/shared';

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} → ${fmt(end)}`;
}

export default function MerchantPayouts() {
  const [payouts, setPayouts] = useState<WebPayout[]>([]);
  const [merchant, setMerchant] = useState<WebMerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([webApi.myPayouts(), webApi.myMerchant()])
      .then(([p, m]) => {
        setPayouts(p.items);
        setMerchant(m);
      })
      .finally(() => setLoading(false));
  }, []);

  const commissionPct = merchant
    ? (merchant.commissionBps / 100).toFixed(1).replace('.', ',')
    : null;

  return (
    <MerchantShell title="Versements">
      {loading ? (
        <p className="text-black/50">Chargement…</p>
      ) : (
        <>
          {merchant && !merchant.payoutIban ? (
            <div className="mb-4 rounded-2xl bg-yellow/20 px-4 py-3 text-sm text-pine">
              <strong>RIB manquant :</strong> renseigne ton IBAN dans les{' '}
              <Link href="/merchant/settings" className="font-semibold underline">
                paramètres
              </Link>{' '}
              pour recevoir tes versements par virement.
            </div>
          ) : null}

          <Panel>
            <p className="text-sm text-black/55">
              Chaque période close génère un versement : montant encaissé en ligne, moins la
              commission Baraka{commissionPct ? ` (${commissionPct} %)` : ''}. Les commandes réglées
              en espèces sont encaissées directement au comptoir.
            </p>
          </Panel>

          <Panel className="mt-4" title="Historique">
            {payouts.length === 0 ? (
              <p className="py-4 text-center text-black/50">
                Aucun versement pour l'instant — ils apparaîtront ici après ta première période de
                ventes.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-black/45">
                      <th className="py-2 pr-3 font-semibold">Période</th>
                      <th className="py-2 pr-3 font-semibold">Brut</th>
                      <th className="py-2 pr-3 font-semibold">Commission</th>
                      <th className="py-2 pr-3 font-semibold">Net</th>
                      <th className="py-2 pr-3 font-semibold">Statut</th>
                      <th className="py-2 font-semibold">Référence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 text-pine">
                          {formatPeriod(p.periodStart, p.periodEnd)}
                        </td>
                        <td className="py-2.5 pr-3">
                          {formatMoney(money(p.grossMinor, p.currency as Currency))}
                        </td>
                        <td className="py-2.5 pr-3 text-black/60">
                          −{formatMoney(money(p.commissionMinor, p.currency as Currency))}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-pine">
                          {formatMoney(money(p.netMinor, p.currency as Currency))}
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusBadge status={p.status} labels={PAYOUT_STATUS_LABELS} />
                        </td>
                        <td className="py-2.5 text-black/60">
                          {p.bankReference ?? '—'}
                          {p.paidAt ? (
                            <span className="block text-xs text-black/40">
                              payé le{' '}
                              {new Date(p.paidAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </MerchantShell>
  );
}
