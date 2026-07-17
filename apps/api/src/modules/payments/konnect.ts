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
import type { Currency } from '@baraka/shared';

interface KonnectConfig {
  apiUrl: string;
  apiKey: string;
  walletId: string;
}

/**
 * Konnect (passerelle tunisienne). Montants NATIVEMENT en millimes → aucune
 * conversion pour le TND. Le webhook est un GET avec `payment_ref` : on ne fait
 * jamais confiance au webhook seul, on RE-VÉRIFIE toujours via l'API (fetchStatus).
 */
export class KonnectProvider implements PaymentProvider {
  readonly id = 'konnect' as const;

  constructor(private readonly cfg: KonnectConfig) {}

  private headers(): Record<string, string> {
    return { 'x-api-key': this.cfg.apiKey, 'Content-Type': 'application/json' };
  }

  async createPayment(ctx: PaymentOrderContext): Promise<CreatePaymentResult> {
    if (ctx.currency !== 'TND') {
      throw new PaymentProviderError('konnect', 'Konnect ne gère que le TND.');
    }
    const res = await fetch(`${this.cfg.apiUrl}/payments/init-payment`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        receiverWalletId: this.cfg.walletId,
        token: 'TND',
        amount: ctx.amountMinor, // millimes
        type: 'immediate',
        description: `Baraka ${ctx.orderNumber}`,
        acceptedPaymentMethods: ['bank_card', 'e-DINAR', 'wallet'],
        lifespan: 10,
        checkoutForm: false,
        orderId: ctx.orderId,
        webhook: ctx.webhookUrl,
        successUrl: ctx.returnUrl,
        failUrl: ctx.returnUrl,
        firstName: ctx.customer.name,
        email: ctx.customer.email,
        phoneNumber: ctx.customer.phone ?? undefined,
      }),
    });
    if (!res.ok) {
      throw new PaymentProviderError('konnect', `init-payment a échoué (${res.status}).`);
    }
    const data = (await res.json()) as { payUrl: string; paymentRef: string };
    return { kind: 'redirect', url: data.payUrl, providerRef: data.paymentRef };
  }

  /**
   * Le webhook Konnect est un GET `?payment_ref=...`. On extrait la référence
   * puis on interroge l'API pour l'état réel (le webhook ne porte pas le statut).
   */
  async parseWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): Promise<NormalizedPaymentEvent> {
    // La référence peut venir de la query (injectée en amont) ou du corps.
    let providerRef = headers['x-konnect-payment-ref'];
    if (!providerRef && rawBody.length) {
      try {
        const parsed = JSON.parse(rawBody.toString('utf8')) as { payment_ref?: string };
        providerRef = parsed.payment_ref;
      } catch {
        /* ignore */
      }
    }
    if (!providerRef) {
      throw new PaymentProviderError('konnect', 'payment_ref absent du webhook.');
    }
    const result = await this.fetchStatus(providerRef);
    return {
      // L'id d'événement inclut le STATUT : un premier webhook 'pending' (ou un rejeu
      // prématuré) ne doit pas geler l'idempotence et faire ignorer le 'succeeded' réel (M16).
      providerEventId: `konnect_${providerRef}_${result.status}`,
      providerRef,
      status: result.status,
      amountMinor: result.amountMinor,
      raw: { providerRef },
    };
  }

  async fetchStatus(providerRef: string): Promise<PaymentStatusResult> {
    const res = await fetch(`${this.cfg.apiUrl}/payments/${providerRef}`, {
      headers: this.headers(),
    });
    if (!res.ok)
      throw new PaymentProviderError('konnect', `Lecture du paiement échouée (${res.status}).`);
    const data = (await res.json()) as {
      payment?: { status?: string; amount?: number; reachedAmount?: number };
    };
    const p = data.payment;
    // reachedAmount = montant effectivement encaissé (millimes) ; à défaut, le montant demandé.
    const paid = p?.reachedAmount ?? p?.amount;
    return {
      status: mapKonnectStatus(p?.status),
      amountMinor: typeof paid === 'number' ? paid : undefined,
    };
  }

  async refund(
    providerRef: string,
    amountMinor: number,
    _currency: Currency,
    idempotencyKey?: string,
  ): Promise<RefundResult> {
    const res = await fetch(`${this.cfg.apiUrl}/payments/${providerRef}/refund`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        // Clé d'idempotence : si un retry suit un succès dont la réponse s'était perdue,
        // le provider dédoublonne au lieu de rembourser deux fois.
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ amount: amountMinor }),
    });
    return { status: res.ok ? 'succeeded' : 'failed', providerRef };
  }
}

function mapKonnectStatus(status: string | undefined): NormalizedStatus {
  switch (status) {
    case 'completed':
      return 'succeeded';
    case 'refunded':
      return 'refunded';
    case 'failed':
    case 'expired':
      return 'failed';
    default:
      return 'pending';
  }
}
