import { describe, it, expect } from 'vitest';
import { generatePickupCode, formatOrderNumber, generateIdempotencyKey } from './ids';

describe('IDs', () => {
  it('code de retrait : 6 chiffres', () => {
    const code = generatePickupCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('numéro de commande formaté', () => {
    expect(formatOrderNumber(2026, 123)).toBe('BRK-2026-000123');
    expect(formatOrderNumber(2026, 1)).toBe('BRK-2026-000001');
  });

  it('clé d idempotence préfixée et unique', () => {
    const a = generateIdempotencyKey('pay');
    const b = generateIdempotencyKey('pay');
    expect(a).toMatch(/^pay_[A-Z0-9]{12}$/);
    expect(a).not.toBe(b);
  });
});
