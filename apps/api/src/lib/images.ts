import sharp from 'sharp';
import { getStorage, type StoredImage } from './storage';

/**
 * Traite une image uploadée : recadrage raisonnable + conversion WebP (≤ ~150 Ko),
 * puis stockage via le StorageDriver. Une seule variante « md » (800px) en M1 ;
 * les variantes multiples viendront avec le CDN.
 */
export async function processAndStoreImage(input: Buffer): Promise<StoredImage> {
  const webp = await sharp(input)
    .rotate() // respecte l'EXIF
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return getStorage().put(webp, { contentType: 'image/webp', originalName: 'image.webp' });
}
