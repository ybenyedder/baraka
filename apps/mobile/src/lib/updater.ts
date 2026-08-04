import Constants from 'expo-constants';
import { storage } from './storage';

// Dépôt GitHub — source unique de vérité pour les releases (APK Android).
const REPO = 'ybenyedder/baraka';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

// Throttle : on ne vérifie au plus toutes les 6 h (l'API GitHub anonyme est
// limitée à 60 req/h/IP — largement assez, mais on reste courtois).
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const KEY_LAST_CHECK = 'update_last_check';
const KEY_SKIPPED_TAG = 'update_skipped_tag';

export interface UpdateInfo {
  /** Tag de la release distante (ex : « v1.2.0 »). */
  tag: string;
  /** Version normalisée sans le « v » (ex : « 1.2.0 »). */
  version: string;
  /** URL de téléchargement direct de l'APK, ou page des releases en repli. */
  downloadUrl: string;
  /** Notes de version (markdown brut), tronquées pour l'affichage. */
  notes: string;
}

type GithubRelease = {
  tag_name: string;
  html_url: string;
  body: string | null;
  assets: { name: string; browser_download_url: string }[];
};

/** Version native de l'app (depuis app.config.ts `version`), ex : « 1.0.0 ». */
export function nativeVersion(): string {
  return (Constants.expoConfig?.version ?? '0.0.0').trim();
}

/** Normalise un tag (« v1.2.0 » → « 1.2.0 », « 1.2.0 » → « 1.2.0 »). */
function normalizeTag(tag: string): string {
  return tag.trim().replace(/^v/i, '');
}

/**
 * Compare deux versions semver (ex : « 1.2.0 »). Retourne > 0 si `remote` est
 * plus récente que `local`, 0 si égales, < 0 si plus ancienne. Tolère les
 * pré-versions ( coupe après le premier « - »).
 */
function compareVersions(remote: string, local: string): number {
  const clean = (v: string) => normalizeTag(v).split('-')[0].split('.');
  const r = clean(remote);
  const l = clean(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const ri = Number.parseInt(r[i] ?? '0', 10);
    const li = Number.parseInt(l[i] ?? '0', 10);
    if (ri !== li) return ri - li;
  }
  return 0;
}

/** Assez de temps écoulé depuis le dernier check (throttle) ? */
function shouldCheck(): boolean {
  const last = storage.getNumber(KEY_LAST_CHECK) ?? 0;
  return Date.now() - last >= CHECK_INTERVAL_MS;
}

/** L'utilisateur a explicitement refusé cette version (ne pas re-reproposer). */
export function skipUpdate(tag: string): void {
  storage.set(KEY_SKIPPED_TAG, tag);
}
function wasSkipped(tag: string): boolean {
  return storage.getString(KEY_SKIPPED_TAG) === tag;
}

/**
 * Vérifie si une mise à jour est disponible sur GitHub Releases.
 * Renvoie l'info si une version plus récente existe (et non ignorée), sinon null.
 * Silencieux en cas d'échec réseau (jamais bloquant pour l'utilisateur).
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!shouldCheck()) return null;
  storage.set(KEY_LAST_CHECK, Date.now());

  try {
    const res = await fetch(LATEST_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GithubRelease;

    const tag = data.tag_name;
    if (!tag || compareVersions(tag, nativeVersion()) <= 0) return null;
    if (wasSkipped(tag)) return null;

    const apk = data.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
    const notes = (data.body ?? '').trim();

    return {
      tag,
      version: normalizeTag(tag),
      downloadUrl: apk?.browser_download_url ?? data.html_url ?? RELEASES_PAGE,
      notes: notes.length > 600 ? `${notes.slice(0, 600)}…` : notes,
    };
  } catch {
    return null;
  }
}
