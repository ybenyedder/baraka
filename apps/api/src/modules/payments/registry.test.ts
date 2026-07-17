import { describe, it, expect } from 'vitest';
import { CashProvider } from './cash';

describe('CashProvider', () => {
  const cash = new CashProvider();

  it('createPayment ne déclenche aucun règlement en ligne', async () => {
    const result = await cash.createPayment({
      orderId: 'o1',
      orderNumber: 'BRK-2026-000001',
      amountMinor: 12500,
      currency: 'TND',
      returnUrl: 'https://x/return',
      webhookUrl: 'https://x/webhook',
      customer: { id: 'u1', email: 'a@b.tn', name: 'Ali' },
    });
    expect(result.kind).toBe('none');
  });

  it('fetchStatus considère le cash comme réglé au retrait', async () => {
    expect(await cash.fetchStatus()).toEqual({ status: 'succeeded' });
  });
});
