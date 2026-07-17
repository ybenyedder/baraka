import type { PaymentMethod } from '@baraka/shared';
import type { PaymentProvider } from './provider';
import { CashProvider } from './cash';
import { KonnectProvider } from './konnect';
import { StripeProvider } from './stripe';
import { env } from '../../config/env';
import { errors } from '../../lib/errors';

/**
 * Registre des providers actifs, construit depuis PAYMENT_PROVIDERS.
 * Le cash est toujours disponible ; konnect/stripe seulement si configurés.
 */
function buildRegistry(): Map<PaymentMethod, PaymentProvider> {
  const map = new Map<PaymentMethod, PaymentProvider>();
  const wanted = new Set(env.PAYMENT_PROVIDERS);

  map.set('cash', new CashProvider());

  if (wanted.has('konnect') && env.KONNECT_API_KEY && env.KONNECT_WALLET_ID) {
    map.set(
      'konnect',
      new KonnectProvider({
        apiUrl: env.KONNECT_API_URL,
        apiKey: env.KONNECT_API_KEY,
        walletId: env.KONNECT_WALLET_ID,
      }),
    );
  }

  if (wanted.has('stripe') && env.STRIPE_SECRET_KEY) {
    map.set('stripe', new StripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET));
  }

  return map;
}

const registry = buildRegistry();

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const provider = registry.get(method);
  if (!provider) {
    throw errors.badRequest(`Moyen de paiement « ${method} » indisponible.`);
  }
  return provider;
}

export function enabledPaymentMethods(): PaymentMethod[] {
  return [...registry.keys()];
}
