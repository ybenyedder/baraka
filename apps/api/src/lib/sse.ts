import type { FastifyReply } from 'fastify';

/**
 * Hub SSE en mémoire (mono-instance — hypothèse Pi documentée).
 * Canaux typiques : `order:{orderId}` (statut client), `merchant:{merchantId}` (flux commandes).
 * Passe le tunnel Cloudflare grâce au heartbeat périodique.
 */
type Client = { reply: FastifyReply };

class SseHub {
  private channels = new Map<string, Set<Client>>();
  private total = 0;
  /** Plafonds anti-DoS (épuisement mémoire/FD sur l'instance unique). */
  private static readonly MAX_TOTAL = 5000;
  private static readonly MAX_PER_CHANNEL = 200;

  subscribe(channel: string, reply: FastifyReply): () => void {
    const set = this.channels.get(channel) ?? new Set<Client>();
    // Rejette au-delà des plafonds (ferme la connexion) plutôt que d'accumuler sans borne (H4).
    if (this.total >= SseHub.MAX_TOTAL || set.size >= SseHub.MAX_PER_CHANNEL) {
      try {
        reply.raw.end();
      } catch {
        /* ignore */
      }
      return () => {};
    }
    const client: Client = { reply };
    if (!this.channels.has(channel)) this.channels.set(channel, set);
    set.add(client);
    this.total += 1;

    const cleanup = (): void => this.remove(channel, client);
    reply.raw.on('close', cleanup);
    // SANS ce handler 'error', une écriture sur un socket rompu émettrait un 'error' non capté
    // → uncaughtException → arrêt du process mono-instance (H4).
    reply.raw.on('error', cleanup);
    return cleanup;
  }

  private remove(channel: string, client: Client): void {
    const set = this.channels.get(channel);
    if (!set || !set.has(client)) return; // idempotent (close ET error peuvent tous deux déclencher)
    set.delete(client);
    this.total -= 1;
    if (set.size === 0) this.channels.delete(channel);
  }

  private safeWrite(channel: string, client: Client, payload: string): void {
    try {
      client.reply.raw.write(payload);
    } catch {
      // Écriture échouée (socket fermé/rompu) → on retire le client, jamais de propagation.
      this.remove(channel, client);
    }
  }

  publish(channel: string, event: string, data: unknown): void {
    const set = this.channels.get(channel);
    if (!set) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of [...set]) this.safeWrite(channel, client, payload);
  }

  /** Commentaire de heartbeat (garde la connexion vivante à travers les proxies). */
  heartbeatAll(): void {
    for (const [channel, set] of this.channels) {
      for (const client of [...set]) this.safeWrite(channel, client, ': ping\n\n');
    }
  }
}

export const sse = new SseHub();

/** Prépare une réponse Fastify pour le streaming SSE. */
export function initSse(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.write(': connected\n\n');
}
