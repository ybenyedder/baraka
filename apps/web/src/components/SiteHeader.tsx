'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SessionUser } from '@baraka/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { LangSwitcher } from '@/components/LangSwitcher';
import { AUTH_EVENT, clearSession, getStoredUser, getToken } from '@/lib/client';
import { homeFor } from '@/lib/auth-nav';

/** En-tête public collant : nav desktop + menu mobile, état connecté. */
export function SiteHeader() {
  const t = useTranslations('common');
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getToken() ? getStoredUser() : null);
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function logout() {
    clearSession();
    setOpen(false);
    router.push('/');
  }

  // Lien « espace » selon le rôle (client → commandes, pro → dashboard).
  const spaceHref = user ? (user.role === 'customer' ? '/account/orders' : homeFor(user)) : null;
  const spaceLabel = user
    ? user.role === 'admin'
      ? t('account.admin')
      : user.role === 'merchant' || user.isMerchant
        ? t('account.merchant')
        : t('account.orders')
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-pine/10 bg-cream/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="Baraka" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo tone="pine" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#how-it-works" className="text-sm font-bold text-pine hover:underline">
            {t('landing.nav.how')}
          </Link>
          <Link href="/business" className="text-sm font-bold text-pine hover:underline">
            {t('landing.nav.merchants')}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitcher />
          <Button href="/browse" className="max-sm:hidden">
            {t('landing.hero.ctaFind')}
          </Button>
          {user && spaceHref ? (
            <>
              <Button href={spaceHref} variant="outline" className="max-sm:hidden">
                {spaceLabel}
              </Button>
              <button
                type="button"
                onClick={logout}
                className="hidden px-2 py-2 text-sm font-semibold text-black/50 hover:text-pine sm:block"
              >
                {t('account.logout')}
              </button>
            </>
          ) : (
            <Button href="/login" variant="outline" className="max-sm:hidden">
              {t('account.login')}
            </Button>
          )}

          {/* Menu mobile */}
          <button
            type="button"
            aria-label={t('account.menu')}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex size-11 items-center justify-center rounded-full text-pine sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </Container>

      {open ? (
        <nav className="border-t border-pine/10 bg-cream px-4 pb-4 pt-2 shadow-md sm:hidden">
          <MobileLink href="/browse" onNavigate={() => setOpen(false)}>
            {t('landing.hero.ctaFind')}
          </MobileLink>
          <MobileLink href="/#how-it-works" onNavigate={() => setOpen(false)}>
            {t('landing.nav.how')}
          </MobileLink>
          <MobileLink href="/business" onNavigate={() => setOpen(false)}>
            {t('landing.nav.merchants')}
          </MobileLink>
          {user && spaceHref ? (
            <>
              <MobileLink href={spaceHref} onNavigate={() => setOpen(false)}>
                {spaceLabel}
              </MobileLink>
              <button
                type="button"
                onClick={logout}
                className="block w-full rounded-xl px-3 py-3 text-start font-bold text-red-600"
              >
                {t('account.logout')}
              </button>
            </>
          ) : (
            <MobileLink href="/login" onNavigate={() => setOpen(false)}>
              {t('account.login')}
            </MobileLink>
          )}
        </nav>
      ) : null}
    </header>
  );
}

function MobileLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-xl px-3 py-3 font-bold text-pine hover:bg-pine/5"
    >
      {children}
    </Link>
  );
}
