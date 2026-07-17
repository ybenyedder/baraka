'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { getToken, getStoredUser, clearToken } from '@/lib/client';
import { Logo } from '@/components/ui/Logo';

const NAV = [
  { href: '/merchant', label: "Vue d'ensemble", exact: true },
  { href: '/merchant/stores', label: 'Boutiques' },
  { href: '/merchant/orders', label: 'Commandes' },
  { href: '/merchant/payouts', label: 'Versements' },
  { href: '/merchant/settings', label: 'Paramètres' },
] as const;

/**
 * Enveloppe du portail commerçant : garde d'authentification, top bar pine,
 * navigation latérale (desktop) ou en onglets défilants (mobile).
 */
export function MerchantShell({ title, children }: { title?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/merchant');
      return;
    }
    // Garde de rôle : le portail commerçant est réservé aux commerçants.
    const user = getStoredUser();
    if (user?.role !== 'merchant' && !user?.isMerchant) {
      router.replace('/login?next=/merchant');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  function isActive(item: (typeof NAV)[number]): boolean {
    if ('exact' in item && item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-20 bg-pine">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/merchant" className="flex items-center gap-2">
            <Logo tone="cream" withWordmark={false} />
            <span className="font-display text-lg font-extrabold text-cream">
              Baraka <span className="text-yellow">Business</span>
            </span>
          </Link>
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
        {/* Onglets mobiles */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                isActive(item) ? 'bg-yellow text-pine' : 'text-cream/80 hover:bg-cream/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        {/* Navigation latérale desktop */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-20 grid gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive(item)
                    ? 'bg-pine text-cream'
                    : 'text-pine/80 hover:bg-pine/5 hover:text-pine'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {title ? (
            <h1 className="font-display mb-6 text-2xl font-extrabold text-pine">{title}</h1>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
