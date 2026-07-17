import type { PaymentMethod, PaymentStatus, RefundStatus, Currency } from '@baraka/shared';

/** Contexte minimal d'une commande à régler, transmis au provider. */
export interface PaymentOrderContext {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: Currency;
  /** URL de retour après paiement (deep link app ou page web). */
  returnUrl: string;
  /** URL de webhook du provider. */
  webhookUrl: string;
  customer: { id: string; email: string; name: string; phone?: string | null };
}

/** Résultat de création de paiement, normalisé pour l'app. */
export type CreatePaymentResult =
  | { kind: 'none' } // cash : la commande passe directement en 'reserved'
  | { kind: 'redirect'; url: string; providerRef: string } // konnect
  | { kind: 'client_secret'; secret: string; providerRef: string }; // stripe

/** Statut de paiement normalisé (sous-ensemble de PaymentStatus). */
export type NormalizedStatus = Extract<
  PaymentStatus,
  'pending' | 'succeeded' | 'failed' | 'refunded'
>;

/** Événement de paiement normalisé issu d'un webhook. */
export interface NormalizedPaymentEvent {
  providerEventId: string;
  providerRef: string;
  status: NormalizedStatus;
  /** Montant réellement encaissé (unités mineures), si le provider le fournit. */
  amountMinor?: number;
  raw: unknown;
}

/** État renvoyé par fetchStatus : statut + montant encaissé (défense contre le sous-paiement). */
export interface PaymentStatusResult {
  status: NormalizedStatus;
  amountMinor?: number;
}

export interface RefundResult {
  status: RefundStatus;
  providerRef?: string;
}

/**
 * Contrat commun aux trois moyens de paiement. Toute la logique de commande
 * (orders/state-machine) est agnostique du provider concret.
 */
export interface PaymentProvider {
  readonly id: PaymentMethod;
  createPayment(ctx: PaymentOrderContext): Promise<CreatePaymentResult>;
  parseWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): Promise<NormalizedPaymentEvent>;
  /** `idempotencyKey` (stable par paiement) : évite un double débit si un retry suit un
   *  succès dont la réponse HTTP s'était perdue. */
  refund(
    providerRef: string,
    amountMinor: number,
    currency: Currency,
    idempotencyKey?: string,
  ): Promise<RefundResult>;
  /** Filet de réconciliation : ré-interroge le provider sur l'état réel + le montant. */
  fetchStatus(providerRef: string): Promise<PaymentStatusResult>;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly provider: PaymentMethod,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'PaymentProviderError';
  }
}
