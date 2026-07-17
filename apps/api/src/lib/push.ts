import { env } from '../config/env';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

/**
 * Envoi de notifications via le service Expo Push (batch de 100 max).
 * La vérification des reçus (tokens morts → purge) est faite par un job séparé.
 */
export async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100).map((m) => ({ sound: 'default', ...m }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch),
        // Timeout dur : un Expo lent ne doit jamais bloquer le worker (fan-out) indéfiniment.
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // On n'échoue jamais une opération métier à cause d'un push.
    }
  }
}
