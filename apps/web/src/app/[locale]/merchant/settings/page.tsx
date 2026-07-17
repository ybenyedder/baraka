'use client';

import { useEffect, useState } from 'react';
import { MerchantShell } from '@/components/MerchantShell';
import {
  Field,
  Panel,
  Feedback,
  inputCls,
  StatusBadge,
  MERCHANT_STATUS_LABELS,
} from '@/components/merchant/ui';
import { webApi, type WebMerchantProfile } from '@/lib/client';
import { Button } from '@/components/ui/Button';

export default function MerchantSettings() {
  const [merchant, setMerchant] = useState<WebMerchantProfile | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [payoutIban, setPayoutIban] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void webApi.myMerchant().then((m) => {
      setMerchant(m);
      setContactEmail(m.contactEmail);
      setContactPhone(m.contactPhone ?? '');
      setTaxId(m.taxId ?? '');
      setPayoutIban(m.payoutIban ?? '');
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const updated = await webApi.updateMerchant({
        contactEmail,
        contactPhone: contactPhone || null,
        taxId: taxId || null,
        payoutIban: payoutIban || null,
      });
      setMerchant(updated);
      setMsg({ text: 'Profil mis à jour.', ok: true });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <MerchantShell title="Paramètres">
      {!merchant ? (
        <p className="text-black/50">Chargement…</p>
      ) : (
        <div className="grid max-w-2xl gap-6">
          <Panel title="Mon entreprise">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Raison sociale
                </dt>
                <dd className="mt-1 font-semibold text-pine">{merchant.legalName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Statut
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={merchant.status} labels={MERCHANT_STATUS_LABELS} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Commission Baraka
                </dt>
                <dd className="mt-1 font-semibold text-pine">
                  {(merchant.commissionBps / 100).toFixed(1).replace('.', ',')} % sur les paiements
                  en ligne
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-black/45">
                  Partenaire depuis
                </dt>
                <dd className="mt-1 text-pine">
                  {new Date(merchant.createdAt).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-black/45">
              Pour modifier la raison sociale ou la commission, contacte l'équipe Baraka.
            </p>
          </Panel>

          <form onSubmit={submit}>
            <Panel title="Contact & facturation">
              <div className="grid gap-4">
                <Field label="E-mail de contact">
                  <input
                    className={inputCls}
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Téléphone">
                  <input
                    className={inputCls}
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </Field>
                <Field label="Matricule fiscal">
                  <input
                    className={inputCls}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </Field>
                <Field label="IBAN / RIB (pour recevoir les versements)">
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder="TN59 …"
                    value={payoutIban}
                    onChange={(e) => setPayoutIban(e.target.value)}
                  />
                </Field>
              </div>
              <Feedback msg={msg} />
              <Button type="submit" className="mt-5" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </Panel>
          </form>
        </div>
      )}
    </MerchantShell>
  );
}
