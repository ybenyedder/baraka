import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { customAlphabet } from 'nanoid';
import { env } from '../config/env';

const keyId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 20);

// Extensions autorisées pour une clé stockée (liste blanche : jamais de .svg exécutable, etc.).
const ALLOWED_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif']);

export interface StoredImage {
  key: string;
  url: string;
}

/**
 * Abstraction de stockage des images. `LocalDiskDriver` en dev/Pi,
 * `S3Driver` (R2/S3) pour un déploiement Europe — un simple changement d'env.
 * Le redimensionnement WebP (sharp) sera branché à l'upload en M1.
 */
export interface StorageDriver {
  put(buffer: Buffer, opts: { contentType: string; originalName?: string }): Promise<StoredImage>;
  urlForKey(key: string): string;
  /** Supprime un objet stocké (best-effort : ne lève pas si absent). */
  remove(key: string): Promise<void>;
}

/** Extension sûre dérivée du nom d'origine (liste blanche), sinon '.bin' (servi en octet-stream). */
function safeExt(originalName?: string): string {
  const ext = originalName ? extname(originalName).toLowerCase() : '';
  return ALLOWED_EXT.has(ext) ? ext : '.bin';
}

class LocalDiskDriver implements StorageDriver {
  constructor(
    private readonly dir: string,
    private readonly publicUrl: string,
  ) {}

  async put(
    buffer: Buffer,
    opts: { contentType: string; originalName?: string },
  ): Promise<StoredImage> {
    const key = `${keyId()}${safeExt(opts.originalName)}`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, key), buffer);
    return { key, url: this.urlForKey(key) };
  }

  urlForKey(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async remove(key: string): Promise<void> {
    // Clé = nom de fichier plat (jamais de chemin) ; on ignore l'absence du fichier.
    if (!key || key.includes('/') || key.includes('\\') || key.includes('..')) return;
    try {
      await unlink(join(this.dir, key));
    } catch {
      /* déjà absent — best-effort */
    }
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  // S3Driver à implémenter quand STORAGE_DRIVER=s3 (parité d'interface garantie).
  driver = new LocalDiskDriver(env.STORAGE_LOCAL_DIR, env.STORAGE_PUBLIC_URL);
  return driver;
}
