'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/DashboardShell';
import { webApi, type WebMerchant } from '@/lib/client';

export default function AdminMerchants() {
  const [items, setItems] = useState<WebMerchant[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await webApi.adminMerchants(filter || undefined);
    setItems(res.items);
  }, [filter]);
  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: 'approved' | 'rejected' | 'suspended') {
    setBusy(id);
    try {
      await webApi.decideMerchant(id, status);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <DashboardShell title="Baraka · Approbations">
      <div className="mb-4 flex gap-2">
        {['pending', 'approved', 'rejected', 'suspended', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === s ? 'bg-pine text-cream' : 'bg-white text-black/60'}`}
          >
            {s || 'tous'}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-black/50">Aucun commerçant.</p>
        ) : (
          items.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-pine">{m.legalName}</p>
                <p className="text-sm text-black/50">{m.contactEmail}</p>
                <span className="mt-1 inline-block rounded-full bg-yellow/30 px-2 py-0.5 text-xs font-semibold text-pine">
                  {m.status}
                </span>
              </div>
              {m.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    disabled={busy === m.id}
                    onClick={() => decide(m.id, 'approved')}
                    className="rounded-full bg-yellow px-4 py-2 text-sm font-bold text-pine disabled:opacity-60"
                  >
                    Approuver
                  </button>
                  <button
                    disabled={busy === m.id}
                    onClick={() => decide(m.id, 'rejected')}
                    className="rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-black/70 disabled:opacity-60"
                  >
                    Rejeter
                  </button>
                </div>
              ) : m.status === 'approved' ? (
                <button
                  disabled={busy === m.id}
                  onClick={() => decide(m.id, 'suspended')}
                  className="rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
                >
                  Suspendre
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}
