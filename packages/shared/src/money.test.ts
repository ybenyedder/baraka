import { describe, it, expect } from 'vitest';
import {
  money,
  zero,
  fromMajor,
  toMajor,
  add,
  subtract,
  sum,
  multiplyByQuantity,
  applyBps,
  clampToZero,
  compare,
  equals,
  abs,
  formatMoney,
  MoneyError,
  CURRENCY_EXPONENT,
} from './money';

describe('Money — construction & invariants', () => {
  it('rejette les montants non entiers', () => {
    expect(() => money(12.5, 'TND')).toThrow(MoneyError);
  });

  it('accepte les entiers en unités mineures', () => {
    expect(money(12500, 'TND').amountMinor).toBe(12500);
  });

  it('connaît le bon exposant par devise', () => {
    expect(CURRENCY_EXPONENT.TND).toBe(3);
    expect(CURRENCY_EXPONENT.EUR).toBe(2);
  });
});

describe('Money — conversions majeur/mineur', () => {
  it('convertit 12,5 TND en 12500 millimes', () => {
    expect(fromMajor(12.5, 'TND').amountMinor).toBe(12500);
  });

  it('convertit 12,50 EUR en 1250 centimes', () => {
    expect(fromMajor(12.5, 'EUR').amountMinor).toBe(1250);
  });

  it('arrondit correctement les valeurs majeures imprécises', () => {
    // 0.1 + 0.2 = 0.30000000000000004 en flottant → doit donner 300 millimes
    expect(fromMajor(0.1 + 0.2, 'TND').amountMinor).toBe(300);
  });

  it('round-trip majeur → mineur → majeur', () => {
    expect(toMajor(fromMajor(7.5, 'TND'))).toBe(7.5);
  });
});

describe('Money — arithmétique', () => {
  it('additionne dans la même devise', () => {
    expect(add(money(1000, 'TND'), money(500, 'TND')).amountMinor).toBe(1500);
  });

  it('refuse d additionner des devises différentes', () => {
    expect(() => add(money(1000, 'TND'), money(500, 'EUR'))).toThrow(MoneyError);
  });

  it('soustrait', () => {
    expect(subtract(money(1000, 'TND'), money(300, 'TND')).amountMinor).toBe(700);
  });

  it('somme une liste', () => {
    const items = [money(1000, 'TND'), money(2500, 'TND'), money(500, 'TND')];
    expect(sum(items, 'TND').amountMinor).toBe(4000);
  });

  it('somme vide = zéro', () => {
    expect(sum([], 'TND').amountMinor).toBe(0);
  });

  it('multiplie par une quantité entière', () => {
    expect(multiplyByQuantity(money(4990, 'TND'), 3).amountMinor).toBe(14970);
  });

  it('refuse une quantité non entière', () => {
    expect(() => multiplyByQuantity(money(4990, 'TND'), 1.5)).toThrow(MoneyError);
  });
});

describe('Money — commission (bps)', () => {
  it('12 % de 10,000 TND = 1200 millimes', () => {
    expect(applyBps(money(10000, 'TND'), 1200).amountMinor).toBe(1200);
  });

  it('arrondit au millime le plus proche', () => {
    // 15 % de 3333 = 499.95 → 500
    expect(applyBps(money(3333, 'TND'), 1500).amountMinor).toBe(500);
  });

  it('0 bps = 0', () => {
    expect(applyBps(money(9999, 'TND'), 0).amountMinor).toBe(0);
  });
});

describe('Money — comparaisons & garde-fous', () => {
  it('clampToZero ramène un négatif à zéro', () => {
    expect(clampToZero(money(-500, 'TND')).amountMinor).toBe(0);
    expect(clampToZero(money(500, 'TND')).amountMinor).toBe(500);
  });

  it('compare correctement', () => {
    expect(compare(money(100, 'TND'), money(200, 'TND'))).toBe(-1);
    expect(compare(money(200, 'TND'), money(200, 'TND'))).toBe(0);
    expect(compare(money(300, 'TND'), money(200, 'TND'))).toBe(1);
  });

  it('equals tient compte de la devise', () => {
    expect(equals(money(100, 'TND'), money(100, 'TND'))).toBe(true);
    expect(equals(money(100, 'TND'), money(100, 'EUR'))).toBe(false);
  });

  it('abs', () => {
    expect(abs(money(-750, 'TND')).amountMinor).toBe(750);
  });
});

describe('Money — formatage', () => {
  it('formate un TND avec 3 décimales', () => {
    const s = formatMoney(money(12500, 'TND'), 'fr-TN');
    // La sortie exacte dépend d'ICU ; on vérifie la structure clé.
    expect(s).toContain('12');
    expect(s).toMatch(/12[.,]500/);
  });

  it('utilise des chiffres occidentaux même en arabe', () => {
    const s = formatMoney(money(12500, 'TND'), 'ar-TN');
    // Aucun chiffre arabe oriental (٠-٩) ne doit apparaître.
    expect(s).not.toMatch(/[٠-٩]/);
  });

  it('formate un EUR avec 2 décimales', () => {
    const s = formatMoney(money(1250, 'EUR'), 'fr-FR');
    expect(s).toMatch(/12[.,]50/);
  });

  it('zéro se formate sans erreur', () => {
    expect(() => formatMoney(zero('TND'))).not.toThrow();
  });
});
