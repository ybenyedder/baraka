'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { webApi } from '@/lib/client';
import { Stat } from '@/components/ui/Stat';
import { formatMoney, money } from '@baraka/shared';

type Stats = Awaited<ReturnType<typeof webApi.adminStats>>;

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    webApi
      .adminStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <DashboardShell title="Baraka · Admin">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Utilisateurs" value={String(stats?.users ?? '—')} />
        <Stat label="Commerçants" value={String(stats?.merchants ?? '—')} />
        <Stat label="Boutiques actives" value={String(stats?.activeStores ?? '—')} />
        <Stat label="Commandes aujourd'hui" value={String(stats?.ordersToday ?? '—')} />
        <Stat
          label="GMV aujourd'hui"
          value={stats ? formatMoney(money(stats.gmvTodayMinor, 'TND')) : '—'}
        />
        <Stat label="Paniers sauvés (total)" value={String(stats?.bagsSavedTotal ?? '—')} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/merchants"
          className="flex items-center justify-between gap-2 rounded-2xl bg-white p-5 shadow-sm transition hover:bg-black/[0.02]"
        >
          <span className="font-semibold text-pine">File d'approbation des commerçants</span>
          <svg
            viewBox="0 0 24 24"
            className="dir-icon h-5 w-5 shrink-0 text-pine"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </DashboardShell>
  );
}
