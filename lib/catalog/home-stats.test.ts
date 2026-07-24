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
    expect(s).toEqual({
      firmCount: 0,
      offerCount: 0,
      cheapest: null,
      firms: [],
      noConsistencyFirms: [],
      activationFirms: [],
      trailCount: 0,
      fundedHardeningCount: 0,
    });
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

describe('bandeau de firms', () => {
  it('donne à chaque firm son prix d’entrée = plus bas prix TTC connu', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', firm: { slug: 'f1', name: 'F1', health_score: 70 }, price: 200, activation_fee: 0, is_recurring: false })),
      toPublicOffer(row({ id: 'b', firm: { slug: 'f1', name: 'F1', health_score: 70 }, price: 120, activation_fee: 0, is_recurring: false })),
      toPublicOffer(row({ id: 'c', firm: { slug: 'f2', name: 'F2', health_score: 60 }, price: 90, activation_fee: 0, is_recurring: false })),
    ];
    const { firms } = buildHomeStats(offers);
    // triées par prix d'entrée croissant : F2 (90) avant F1 (120)
    expect(firms.map((f) => [f.name, f.entryPrice, f.offerCount])).toEqual([
      ['F2', 90, 1],
      ['F1', 120, 2],
    ]);
  });

  it('un prix d’entrée inconnu passe en dernier, jamais à 0', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', firm: { slug: 'f1', name: 'F1', health_score: 70 }, price: null })),
      toPublicOffer(row({ id: 'b', firm: { slug: 'f2', name: 'F2', health_score: 60 }, price: 90, activation_fee: 0, is_recurring: false })),
    ];
    const { firms } = buildHomeStats(offers);
    expect(firms.map((f) => f.name)).toEqual(['F2', 'F1']);
    expect(firms.find((f) => f.name === 'F1')?.entryPrice).toBeNull();
  });

  it('remonte la promo de la firm, signalée comme promo', () => {
    const o = toPublicOffer(
      row({ firm: { slug: 'f1', name: 'F1', health_score: 70 }, promo: { code: 'TG40', discount_pct: 40, ends_at: null } }),
    );
    const firm = buildHomeStats([o]).firms[0];
    expect(firm.promo).toEqual({ code: 'TG40', discountPct: 40, permanent: true });
  });
});

describe('facettes FAQ', () => {
  it('liste les firms proposant au moins une offre sans cohérence', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', firm: { slug: 'f1', name: 'F1', health_score: 70 }, consistency_pct: 40 })),
      toPublicOffer(row({ id: 'b', firm: { slug: 'f2', name: 'F2', health_score: 60 }, consistency_pct: null })),
    ];
    expect(buildHomeStats(offers).noConsistencyFirms).toEqual(['F2']);
  });

  it('liste les firms facturant une activation, et compte trailing + durcissement', () => {
    const offers = [
      toPublicOffer(row({ id: 'a', firm: { slug: 'f1', name: 'F1', health_score: 70 }, activation_fee: 130, drawdown_type: 'TRAIL' })),
      toPublicOffer(row({ id: 'b', firm: { slug: 'f2', name: 'F2', health_score: 60 }, activation_fee: 0, is_recurring: false, drawdown_type: 'EOD', funded_drawdown_type: 'TRAIL' })),
    ];
    const s = buildHomeStats(offers);
    expect(s.activationFirms).toEqual(['F1']);
    expect(s.trailCount).toBe(1);
    expect(s.fundedHardeningCount).toBe(1);
  });
});
