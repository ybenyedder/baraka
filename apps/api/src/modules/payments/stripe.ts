import type {
  PaymentProvider,
  PaymentOrderContext,
  CreatePaymentResult,
  NormalizedPaymentEvent,
  NormalizedStatus,
  PaymentStatusResult,
  RefundResult,
} from './provider';
import { PaymentProviderError } from './provider';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Currency } from '@baraka/shared';

/** Vérifie la signature `stripe-signature` (schéma `t=…,v1=…`) sur le corps BRUT. */
function verifyStripeSignature(
  payload: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=', 2)));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  const expected = createHmac('sha256', secret)
    .update(`${t}.${payload.toString('utf8')}`)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(v1, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Stripe — codé et testé mais DORMANT en Tunisie (Stripe n'y opère pas, pas de TND).
 * Destiné à une future entité UE (EUR, centimes). Implémentation via l'API REST Stripe
 * (pas de SDK) pour rester léger. Activé seulement si STRIPE_SECRET_KEY est présent.
 */
export class StripeProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  private readonly base = 'https://api.stripe.com/v1';

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  async createPayment(ctx: PaymentOrderContext): Promise<CreatePaymentResult> {
    const body = new URLSearchParams({
      amount: String(ctx.amountMinor),
      currency: ctx.currency.toLowerCase(),
      'metadata[orderId]': ctx.orderId,
      'automatic_payment_methods[enabled]': 'true',
    });
    const res = await fetch(`${this.base}/payment_intents`, {
      method: 'POST',
      headers: this.headers(),
      body,
    });
    if (!res.ok) throw new PaymentProviderError('stripe', `PaymentIntent échoué (${res.status}).`);
    const data = (await res.json()) as { id: string; client_secret: string };
    return { kind: 'client_secret', secret: data.client_secret, providerRef: data.id };
  }

  async parseWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): Promise<NormalizedPaymentEvent> {
    if (!this.webhookSecret) {
      throw new PaymentProviderError('stripe', 'Webhook Stripe non configuré.');
    }
    // Vérifie la signature sur les octets BRUTS avant tout traitement (anti-webhook forgé).
    if (!verifyStripeSignature(rawBody, headers['stripe-signature'], this.webhookSecret)) {
      throw new PaymentProviderError('stripe', 'Signature de webhook Stripe invalide.');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as {
      id: string;
      type: string;
      data: {
        object: { id: string; payment_intent?: string; amount_received?: number; amount?: number };
      };
    };
    // charge.refunded porte une charge (ch_) : on rattache au PaymentIntent (pi_) stocké.
    const obj = event.data.object;
    const providerRef =
      event.type === 'charge.refunded' && obj.payment_intent ? obj.payment_intent : obj.id;
    const paid = obj.amount_received ?? obj.amount;
    return {
      providerEventId: event.id,
      providerRef,
      status: mapStripeEvent(event.type),
      amountMinor: typeof paid === 'number' ? paid : undefined,
      raw: event,
    };
  }

  async fetchStatus(providerRef: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${this.base}/payment_intents/${providerRef}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new PaymentProviderError('stripe', `Lecture échouée (${res.status}).`);
    const data = (await res.json()) as {
      status: string;
      amount_received?: number;
      amount?: number;
    };
    const paid = data.amount_received ?? data.amount;
    return {
      status: mapStripeStatus(data.status),
      amountMinor: typeof paid === 'number' ? paid : undefined,
    };
  }

  async refund(
    providerRef: string,
    amountMinor: number,
    _currency: Currency,
    idempotencyKey?: string,
  ): Promise<RefundResult> {
    const body = new URLSearchParams({ payment_intent: providerRef, amount: String(amountMinor) });
    const res = await fetch(`${this.base}/refunds`, {
      method: 'POST',
      // Stripe déduplique nativement sur l'en-tête Idempotency-Key (évite un double
      // remboursement si un retry suit un succès non confirmé côté client).
      headers: {
        ...this.headers(),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body,
    });
    return { status: res.ok ? 'succeeded' : 'failed', providerRef };
  }
}

function mapStripeStatus(status: string): NormalizedStatus {
  switch (status) {
    case 'succeeded':
      return 'succeeded';
    case 'canceled':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapStripeEvent(type: string): NormalizedStatus {
  if (type === 'payment_intent.succeeded') return 'succeeded';
  if (type === 'payment_intent.payment_failed') return 'failed';
  if (type === 'charge.refunded') return 'refunded';
  return 'pending';
}
