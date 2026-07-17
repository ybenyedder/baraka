import { and, eq, isNull } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { users, accounts, devices, notificationPrefs, referralEvents } from '@baraka/db';
import { getDb } from '../../lib/db';
import { errors } from '../../lib/errors';
import { hashPassword, verifyPassword, signToken } from '../../lib/auth-tokens';
import type {
  RegisterInput,
  LoginInput,
  RegisterDeviceInput,
  SessionUser,
  Locale,
} from '@baraka/shared';

const referralGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

// Hash factice (format scrypt valide : saltHex:hashHex) comparé quand le compte n'existe pas :
// garantit un coût scrypt constant et empêche l'énumération d'e-mails par timing (M10).
const DUMMY_PASSWORD_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

/**
 * Auth intérimaire (email/mot de passe) — même modèle de tables que better-auth,
 * qui prendra le relais pour Google/Apple/sessions. scrypt + JWT, sans dépendance native.
 */
export async function register(
  input: RegisterInput,
): Promise<{ token: string; user: SessionUser }> {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) throw errors.conflict('Un compte existe déjà avec cet e-mail.');

  let referredByUserId: string | null = null;
  if (input.referralCode) {
    const referrer = await db.query.users.findFirst({
      where: eq(users.referralCode, input.referralCode),
    });
    referredByUserId = referrer?.id ?? null;
  }

  const referralCode = referralGen();
  // Création atomique : user + credential + préférences + éventuel événement de parrainage.
  const user = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        locale: input.locale,
        referralCode,
        referredByUserId,
        role: 'customer',
      })
      .returning();
    if (!created) throw errors.internal('Création du compte échouée.');

    await tx.insert(accounts).values({
      userId: created.id,
      accountId: input.email,
      providerId: 'credential',
      password: await hashPassword(input.password),
    });
    await tx.insert(notificationPrefs).values({ userId: created.id });

    if (referredByUserId) {
      await tx.insert(referralEvents).values({
        referrerUserId: referredByUserId,
        refereeUserId: created.id,
        status: 'signed_up',
      });
    }
    return created;
  });

  const token = await signToken({ sub: user.id, role: user.role, locale: user.locale });
  return { token, user: toSessionUser(user, false) };
}

export async function login(input: LoginInput): Promise<{ token: string; user: SessionUser }> {
  const db = getDb();
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, input.email), isNull(users.deletedAt)),
  });
  const account = user
    ? await db.query.accounts.findFirst({
        where: and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')),
      })
    : null;
  // On vérifie TOUJOURS un hash (réel ou factice) : la réponse prend le même temps que le
  // compte existe ou non → pas d'oracle d'énumération par timing (M10).
  const passwordOk = await verifyPassword(input.password, account?.password ?? DUMMY_PASSWORD_HASH);
  if (!user || !account?.password || !passwordOk) {
    throw errors.unauthorized('E-mail ou mot de passe incorrect.');
  }

  const isMerchant = await userIsMerchant(user.id);
  const token = await signToken({ sub: user.id, role: user.role, locale: user.locale });
  return { token, user: toSessionUser(user, isMerchant) };
}

export async function getMe(userId: string): Promise<SessionUser> {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw errors.notFound('Utilisateur introuvable.');
  return toSessionUser(user, await userIsMerchant(user.id));
}

/** Suppression de compte (exigence App Store / Play). Soft-delete + anonymisation. */
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();
  const stamp = `deleted+${userId}@baraka.invalid`;
  await db
    .update(users)
    .set({ deletedAt: new Date(), email: stamp, name: 'Compte supprimé', phone: null })
    .where(eq(users.id, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(devices).where(eq(devices.userId, userId));
}

export async function registerDevice(userId: string, input: RegisterDeviceInput): Promise<void> {
  const db = getDb();
  await db
    .insert(devices)
    .values({
      userId,
      expoPushToken: input.expoPushToken,
      platform: input.platform,
      appVersion: input.appVersion,
      locale: input.locale,
    })
    .onConflictDoUpdate({
      target: devices.expoPushToken,
      set: { userId, lastActiveAt: new Date(), appVersion: input.appVersion, locale: input.locale },
    });
}

/** Désenregistre un device push (appelé à la déconnexion mobile) — best-effort, borné à l'user. */
export async function unregisterDevice(userId: string, expoPushToken: string): Promise<void> {
  await getDb()
    .delete(devices)
    .where(and(eq(devices.userId, userId), eq(devices.expoPushToken, expoPushToken)));
}

async function userIsMerchant(userId: string): Promise<boolean> {
  const db = getDb();
  const membership = await db.query.merchantMembers.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.userId, userId),
  });
  return Boolean(membership);
}

function toSessionUser(
  user: {
    id: string;
    email: string;
    name: string;
    role: SessionUser['role'];
    locale: Locale;
    referralCode: string;
  },
  isMerchant: boolean,
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locale: user.locale,
    referralCode: user.referralCode,
    isMerchant,
  };
}
