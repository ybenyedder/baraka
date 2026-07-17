import { SignJWT, jwtVerify } from 'jose';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from '../config/env';
import type { UserRole, Locale } from '@baraka/shared';

const scryptAsync = promisify(scrypt);
const secret = new TextEncoder().encode(env.AUTH_SECRET);

/** Nom du cookie de session web (JWT en HttpOnly, inaccessible au JS → anti-XSS). */
export const SESSION_COOKIE = 'baraka_session';

/** Options du cookie de session : HttpOnly + SameSite=Lax (anti-CSRF) + Secure en prod. */
export function sessionCookieOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 jours, aligné sur l'expiration du JWT
  };
}

export interface TokenClaims {
  sub: string; // user id
  role: UserRole;
  locale: Locale;
}

/** Signe un access token (7 jours). */
export async function signToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role, locale: claims.locale })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub),
      role: payload.role as UserRole,
      locale: payload.locale as Locale,
    };
  } catch {
    return null;
  }
}

/** Hache un mot de passe : scrypt + sel (format `sel:hash` en hex). Sans dépendance native. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
