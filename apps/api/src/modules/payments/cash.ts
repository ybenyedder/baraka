import type {
  PaymentProvider,
  PaymentOrderContext,
  CreatePaymentResult,
  NormalizedPaymentEvent,
  PaymentStatusResult,
  RefundResult,
} from './provider';
import { PaymentProviderError } from './provider';

/**
 * Paiement au retrait (espèces). Aucun encaissement en ligne :
 * la commande est réservée immédiatement, la commission s'accumule comme dette
 * du commerçant, compensée dans les payouts.
 */
export class CashProvider implements PaymentProvider {
  readonly id = 'cash' as const;

  async createPayment(_ctx: PaymentOrderContext): Promise<CreatePaymentResult> {
    return { kind: 'none' };
  }

  async parseWebhook(): Promise<NormalizedPaymentEvent> {
    throw new PaymentProviderError('cash', "Le paiement espèces n'a pas de webhook.");
  }

  async refund(
    _providerRef?: string,
    _amountMinor?: number,
    _currency?: unknown,
    _idempotencyKey?: string,
  ): Promise<RefundResult> {
    // Rien n'a été encaissé en ligne → remboursement immédiat « logique ».
    return { status: 'succeeded' };
  }

  async fetchStatus(): Promise<PaymentStatusResult> {
    return { status: 'succeeded' };
  }
}
