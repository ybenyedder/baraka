'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { webApi, setSession } from '@/lib/client';
import { safeNext, homeFor } from '@/lib/auth-nav';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await webApi.login(email.trim(), password);
      setSession(token, user);
      router.replace(user.role === 'customer' ? (next ?? homeFor(user)) : homeFor(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" aria-label="Baraka">
          <Logo />
        </Link>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-pine">{t('login.title')}</h1>

        <label className="mt-6 block">
          <span className="sr-only">{t('login.email')}</span>
          <input
            type="email"
            autoComplete="email"
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-pine/15 px-4 py-3 focus:border-pine focus:outline-none"
            required
          />
        </label>
        <label className="mt-3 block">
          <span className="sr-only">{t('login.password')}</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-pine/15 px-4 py-3 focus:border-pine focus:outline-none"
            required
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} className="mt-6 w-full" size="lg">
          {loading ? '…' : t('login.submit')}
        </Button>

        <p className="mt-5 text-center text-sm text-black/60">
          {t('login.noAccount')}{' '}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
            className="font-bold text-pine underline"
          >
            {t('register.title')}
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
