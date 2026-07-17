import { describe, it, expect } from 'vitest';
import { renderNotif } from './notif-messages';

describe('renderNotif', () => {
  it('remplace les placeholders et localise en français', () => {
    expect(renderNotif('order_reserved', 'fr', { number: 'BRK-2026-000001' })).toEqual({
      title: 'Panier réservé',
      body: 'Ta commande BRK-2026-000001 est réservée. Présente ton code au retrait.',
    });
  });

  it('utilise la locale demandée (arabe)', () => {
    const r = renderNotif('pickup_reminder', 'ar', { store: 'Boulangerie X' });
    expect(r.title).toBe('تذكير بالاستلام');
    expect(r.body).toContain('Boulangerie X');
  });

  it('replie sur le français pour une locale non fournie', () => {
    expect(renderNotif('review_request', 'de' as never).title).toBe('Ton avis compte ⭐');
  });

  it('remplace un placeholder manquant par une chaîne vide', () => {
    expect(renderNotif('favorite_new_bags', 'en', {}).body).toBe(' has bags to save today!');
  });
});
