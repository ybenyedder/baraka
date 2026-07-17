'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { getToken, getStoredUser, clearToken } from '@/lib/client';
import { Logo } from '@/components/ui/Logo';

/** Enveloppe protégée admin : redirige vers /login sans token ou sans rôle admin. */
export function DashboardShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    // Garde de rôle : la console d'administration n'est accessible qu'aux admins.
    if (getStoredUser()?.role !== 'admin') {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <header className="bg-pine">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2">
            <Logo tone="cream" withWordmark={false} />
            <span className="font-display text-lg font-extrabold text-cream">{title}</span>
          </span>
          <button
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
            className="rounded-full border border-cream/30 px-4 py-1.5 text-sm font-semibold text-cream transition hover:bg-cream/10"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
