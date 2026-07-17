import { and, desc, eq, isNull } from 'drizzle-orm';
import { notifications, devices, notificationPrefs, users } from '@baraka/db';
import type { NotificationType, Locale } from '@baraka/shared';
import { getDb, getSql } from '../../lib/db';
import { sendExpoPush, type PushMessage } from '../../lib/push';
import { renderNotif, type NotifKey } from '../../lib/notif-messages';

type Row = Record<string, unknown>;

/** Destinataire d'un envoi en lot (fan-out worker). */
export interface BulkRecipient {
  userId: string;
  key: NotifKey;
  params?: Record<string, string>;
  data?: Record<string, unknown>;
}

/**
 * Notifie un utilisateur : enregistre dans l'inbox in-app ET envoie un push Expo
 * à tous ses appareils (en respectant ses préférences). Ne lève jamais.
 */
export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  try {
    await db.insert(notifications).values({ userId, type, title, body, data: data ?? null });

    if (!(await pushAllowed(userId, type))) return;
    const userDevices = await db.query.devices.findMany({ where: eq(devices.userId, userId) });
    await sendExpoPush(userDevices.map((d) => ({ to: d.expoPushToken, title, body, data })));
  } catch {
    /* jamais bloquant */
  }
}

/** Comme notifyUser, mais localise titre + corps selon la locale de l'utilisateur. */
export async function notifyUserI18n(
  userId: string,
  type: NotificationType,
  key: NotifKey,
  params: Record<string, string> = {},
  data?: Record<string, unknown>,
): Promise<void> {
  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
    columns: { locale: true },
  });
  const { title, body } = renderNotif(key, user?.locale ?? 'fr', params);
  await notifyUser(userId, type, title, body, data);
}

async function pushAllowed(userId: string, type: NotificationType): Promise<boolean> {
  const prefs = await getDb().query.notificationPrefs.findFirst({
    where: eq(notificationPrefs.userId, userId),
  });
  return prefAllows(prefs, type);
}

/** Variante de pushAllowed sur une ligne de préférences déjà chargée (fan-out en lot). */
function prefAllows(
  prefs:
    | {
        marketing?: boolean;
        pickupReminders?: boolean;
        favoritesNewBags?: boolean;
        orderUpdates?: boolean;
      }
    | undefined
    | null,
  type: NotificationType,
): boolean {
  if (!prefs) return true;
  if (type === 'marketing') return Boolean(prefs.marketing);
  if (type === 'pickup_reminder') return Boolean(prefs.pickupReminders);
  if (type === 'favorite_new_bags') return Boolean(prefs.favoritesNewBags);
  if (type === 'order_update') return Boolean(prefs.orderUpdates);
  return true;
}

/**
 * Notifie plusieurs utilisateurs en LOT (fan-out worker). Au lieu de 4 requêtes + 1 fetch push
 * PAR utilisateur en séquentiel (qui bloquaient la libération de stock, H7), on effectue :
 *  1 requête locales · 1 insert inbox groupé · 1 requête prefs · 1 requête devices · 1 push batché.
 * Ne lève jamais.
 */
export async function notifyManyI18n(
  type: NotificationType,
  recipients: BulkRecipient[],
): Promise<void> {
  if (recipients.length === 0) return;
  const db = getDb();
  const sqlClient = getSql();
  const userIds = [...new Set(recipients.map((r) => r.userId))];

  try {
    // 1) Locales de tous les destinataires.
    const localeRows = (await sqlClient`
      SELECT id, locale FROM users WHERE id = ANY(${userIds}::uuid[]) AND deleted_at IS NULL
    `) as unknown as Array<{ id: string; locale: string }>;
    const localeById = new Map(localeRows.map((u) => [u.id, u.locale]));
    if (localeById.size === 0) return;

    // 2) Rendu localisé + insert inbox groupé.
    const rendered = recipients
      .filter((r) => localeById.has(r.userId))
      .map((r) => {
        const msg = renderNotif(
          r.key,
          (localeById.get(r.userId) as Locale) ?? 'fr',
          r.params ?? {},
        );
        return {
          userId: r.userId,
          type,
          title: msg.title,
          body: msg.body,
          data: (r.data ?? null) as Record<string, unknown> | null,
        };
      });
    if (rendered.length === 0) return;
    await db.insert(notifications).values(rendered);

    // 3) Prefs + devices en 2 requêtes, filtrage en mémoire, 1 push batché (100/lot).
    const prefRows = await db.query.notificationPrefs.findMany({
      where: (p, { inArray }) => inArray(p.userId, userIds),
    });
    const prefsByUser = new Map(prefRows.map((p) => [p.userId, p]));
    const deviceRows = await db.query.devices.findMany({
      where: (d, { inArray }) => inArray(d.userId, userIds),
      columns: { userId: true, expoPushToken: true },
    });
    const firstByUser = new Map<string, (typeof rendered)[number]>();
    for (const r of rendered) if (!firstByUser.has(r.userId)) firstByUser.set(r.userId, r);

    const messages: PushMessage[] = [];
    for (const d of deviceRows) {
      if (!prefAllows(prefsByUser.get(d.userId), type)) continue;
      const msg = firstByUser.get(d.userId);
      if (!msg) continue;
      messages.push({
        to: d.expoPushToken,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? undefined,
      });
    }
    await sendExpoPush(messages);
  } catch {
    /* fan-out best-effort — jamais bloquant */
  }
}

export async function listNotifications(userId: string) {
  return getDb().query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: desc(notifications.sentAt),
    limit: 50,
  });
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = (await getSql()`
    SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = ${userId} AND read_at IS NULL
  `) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

export async function markRead(userId: string, id: string): Promise<void> {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string): Promise<void> {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/**
 * Rappels de retrait (~30 min avant le créneau). Dédoublonnage via l'inbox :
 * on ne renvoie pas si un rappel existe déjà pour la commande.
 */
export async function sendPickupReminders(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT o.id, o.user_id, s.name AS store_name
    FROM orders o
    JOIN bag_instances bi ON bi.id = o.bag_instance_id
    JOIN stores s ON s.id = o.store_id
    WHERE o.status = 'reserved'
      AND bi.pickup_start_at BETWEEN now() + interval '25 minutes' AND now() + interval '35 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = o.user_id AND n.type = 'pickup_reminder' AND n.data->>'orderId' = o.id::text
      )
  `) as unknown as Row[];

  await notifyManyI18n(
    'pickup_reminder',
    rows.map((r) => ({
      userId: String(r.user_id),
      key: 'pickup_reminder' as NotifKey,
      params: { store: String(r.store_name) },
      data: { orderId: String(r.id) },
    })),
  );
  return rows.length;
}
