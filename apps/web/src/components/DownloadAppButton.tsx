'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

// Dépôt GitHub — source unique de vérité pour les releases (APK Android).
const REPO = 'ybenyedder/baraka';
const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

type Release = {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string; size: number }[];
};

/**
 * Bouton de téléchargement de l'app Android.
 *
 * Récupère la dernière release GitHub côté client (limite par IP visiteur, ample
 * pour un site public). En cas d'échec (rate limit, réseau), repli sur la page
 * des releases — le bouton n'est JAMAIS cassé.
 */
export function DownloadAppButton() {
  const t = useTranslations('common');
  const [release, setRelease] = useState<Release | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(API_LATEST, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? (r.json() as Promise<Release>) : Promise.reject()))
      .then((data) => !cancelled && setRelease(data))
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // L'APK Android est l'asset « .apk » de la release (sideload).
  const apk = release?.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
  const version = release?.tag_name?.replace(/^v/, '');

  // Repli permanent (JS désactivé, rate limit, réseau coupé) : page des releases.
  const href = apk?.browser_download_url ?? RELEASES_PAGE;
  const label = ready
    ? release
      ? t('landing.app.downloadVersion', { version: version ?? release.tag_name })
      : t('landing.app.download')
    : t('landing.app.download');

  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow px-8 py-3.5 text-base font-bold text-pine transition hover:bg-yellow/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      aria-label={t('landing.app.downloadAria')}
    >
      {/* Icône Android simple (inline, pas de dépendance). */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="M7 8a5 5 0 0 1 10 0" />
        <path d="M5 14V9" />
        <path d="M19 14V9" />
        <path d="M7 15v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
        <path d="M9 21v-2" />
        <path d="M15 21v-2" />
      </svg>
      {label}
    </a>
  );
}
