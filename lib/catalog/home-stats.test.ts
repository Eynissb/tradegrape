import { describe, expect, it } from 'vitest';
import { buildHomeStats } from './home-stats';
import { toPublicOffer } from './public-offer';
import { row } from './offer-row.fixture';

describe('stats de la home — tout vient de la base publiée', () => {
  it('compte les firms distinctes et les offres', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', firm: { slug: 'f1', name: 'F1', health_score: 70 } })),
      toPublicOffer(row({ id: 'b', firm: { slug: 'f1', name: 'F1', health_score: 70 } })),
      toPublicOffer(row({ id: 'c', firm: { slug: 'f2', name: 'F2', health_score: 60 } })),
    ];
    const s = buildHomeStats(offers);
    expect(s.firmCount).toBe(2);
    expect(s.offerCount).toBe(3);
  });

  it('sur un catalogue vide, aucun chiffre inventé', () => {
    const s = buildHomeStats([]);
    expect(s).toEqual({ firmCount: 0, offerCount: 0, cheapest: null });
  });

  it('« le moins cher » est le plus bas prix TTC connu', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', price: 150, activation_fee: 130 })), // 280
      toPublicOffer(row({ id: 'b', price: 99, activation_fee: 0, is_recurring: false })), // 99
      toPublicOffer(row({ id: 'c', price: 200, activation_fee: 0, is_recurring: false })), // 200
    ];
    const s = buildHomeStats(offers);
    expect(s.cheapest?.totalPrice).toBe(99);
    expect(s.cheapest?.currency).toBe('USD');
  });

  it('une offre sans prix ne peut pas être « la moins chère »', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', price: null })), // inconnu — jamais 0
      toPublicOffer(row({ id: 'b', price: 340, activation_fee: 0, is_recurring: false })),
    ];
    const s = buildHomeStats(offers);
    expect(s.cheapest?.totalPrice).toBe(340);
  });

  it('cheapest reste null si aucune offre n’a de prix publié', () => {
    const offers = [toPublicOffer(row({ id: 'a', price: null }))];
    expect(buildHomeStats(offers).cheapest).toBeNull();
  });
});
