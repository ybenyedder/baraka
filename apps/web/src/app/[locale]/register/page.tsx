'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@baraka/i18n/config';
import { webApi, setSession } from '@/lib/client';
import { safeNext } from '@/lib/auth-nav';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

function RegisterForm() {
  const t = useTranslations('auth');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await webApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        locale,
      });
      setSession(token, user);
      router.replace(next ?? '/browse');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible');
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
        <h1 className="mt-3 font-display text-2xl font-extrabold text-pine">
          {t('register.title')}
        </h1>

        <label className="mt-6 block">
          <span className="sr-only">{t('register.name')}</span>
          <input
            type="text"
            autoComplete="name"
            placeholder={t('register.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-pine/15 px-4 py-3 focus:border-pine focus:outline-none"
            required
            maxLength={120}
          />
        </label>
        <label className="mt-3 block">
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
            autoComplete="new-password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-pine/15 px-4 py-3 focus:border-pine focus:outline-none"
            required
            minLength={8}
          />
        </label>
        <p className="mt-2 text-xs text-black/50">{t('register.passwordHint')}</p>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} className="mt-6 w-full" size="lg">
          {loading ? '…' : t('register.submit')}
        </Button>

        <p className="mt-5 text-center text-sm text-black/60">
          {t('register.haveAccount')}{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="font-bold text-pine underline"
          >
            {t('login.submit')}
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
