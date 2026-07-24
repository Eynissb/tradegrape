import { describe, expect, it } from 'vitest';
import {
  toPublicOffer,
  filterOffers,
  hiddenByUnknownPrice,
  sortOffers,
  buildFacets,
  valueOf,
  presetByKey,
} from './public-offer';
import { row } from './offer-row.fixture';

describe('prix — l’inconnu n’est jamais zéro', () => {
  it('un prix renseigné donne un total = prix + activation', () => {
    const o = toPublicOffer(row({ price: 170, activation_fee: 130 }));
    expect(o.price).toEqual({ known: true, value: 170 });
    expect(o.totalPrice).toEqual({ known: true, value: 300 });
  });

  it('un prix NULL rend le prix ET le total inconnus', () => {
    const o = toPublicOffer(row({ price: null, activation_fee: 130 }));
    expect(o.price.known).toBe(false);
    // Surtout PAS 130 : ce nombre se lirait comme un prix.
    expect(o.totalPrice.known).toBe(false);
    expect(valueOf(o.totalPrice)).toBeNull();
  });

  it('un prix à 0 reste connu — « gratuit » n’est pas « inconnu »', () => {
    const o = toPublicOffer(row({ price: 0, activation_fee: 0 }));
    expect(o.price).toEqual({ known: true, value: 0 });
    expect(o.totalPrice).toEqual({ known: true, value: 0 });
  });
});

describe('tri par prix TTC — le piège du « moins cher »', () => {
  const cheap = toPublicOffer(row({ id: 'cheap', price: 50, activation_fee: 0 }));
  const dear = toPublicOffer(row({ id: 'dear', price: 900, activation_fee: 0 }));
  const noPrice = toPublicOffer(row({ id: 'unknown', price: null }));

  it('les offres SANS prix finissent en dernier, jamais en tête', () => {
    const sorted = sortOffers([noPrice, dear, cheap], 'total_price');
    expect(sorted.map((o) => o.id)).toEqual(['cheap', 'dear', 'unknown']);
  });

  it('même quand l’inconnu est déjà en tête du tableau d’entrée', () => {
    const sorted = sortOffers([noPrice, cheap], 'total_price');
    expect(sorted[0].id).toBe('cheap');
  });

  it('l’activation compte dans le tri : un prix bas + grosse activation peut passer derrière', () => {
    const a = toPublicOffer(row({ id: 'a', price: 199, activation_fee: 79 })); // 278
    const b = toPublicOffer(row({ id: 'b', price: 249, activation_fee: 0 })); //  249
    expect(sortOffers([a, b], 'total_price').map((o) => o.id)).toEqual(['b', 'a']);
  });
});

describe('tri par health score — la fiabilité d’abord', () => {
  it('décroissant, et les firms sans score finissent en dernier', () => {
    const good = toPublicOffer(row({ id: 'good', firm: { slug: 'g', name: 'G', health_score: 80 } }));
    const bad = toPublicOffer(row({ id: 'bad', firm: { slug: 'b', name: 'B', health_score: 5 } }));
    const none = toPublicOffer(row({ id: 'none', firm: { slug: 'n', name: 'N', health_score: null } }));
    expect(sortOffers([none, bad, good], 'health').map((o) => o.id)).toEqual(['good', 'bad', 'none']);
  });

  it('c’est le tri par défaut', () => {
    const a = toPublicOffer(row({ id: 'a', firm: { slug: 'a', name: 'A', health_score: 10 } }));
    const b = toPublicOffer(row({ id: 'b', firm: { slug: 'b', name: 'B', health_score: 90 } }));
    expect(sortOffers([a, b]).map((o) => o.id)).toEqual(['b', 'a']);
  });
});

describe('filtre de prix — un inconnu ne satisfait pas « moins de X »', () => {
  const cheap = toPublicOffer(row({ id: 'cheap', price: 50, activation_fee: 0 }));
  const noPrice = toPublicOffer(row({ id: 'unknown', price: null }));

  it('écarte les offres sans prix plutôt que de les présenter comme éligibles', () => {
    const out = filterOffers([cheap, noPrice], { maxTotalPrice: 100 });
    expect(out.map((o) => o.id)).toEqual(['cheap']);
  });

  it('compte combien d’offres sont masquées faute de prix, pour le dire à l’écran', () => {
    expect(hiddenByUnknownPrice([cheap, noPrice], { maxTotalPrice: 100 })).toBe(1);
  });

  it('sans filtre de prix, aucune offre n’est masquée pour cette raison', () => {
    expect(hiddenByUnknownPrice([cheap, noPrice], {})).toBe(0);
    expect(filterOffers([cheap, noPrice], {})).toHaveLength(2);
  });
});

describe('durcissement en financé — le signal produit', () => {
  it('détecte un changement de TYPE (Take Profit Trader)', () => {
    const o = toPublicOffer(row({ drawdown_type: 'EOD', funded_drawdown_type: 'TRAIL' }));
    expect(o.fundedHardening.differs).toBe(true);
  });

  it('détecte un changement de MONTANT à type constant (Phidias)', () => {
    const o = toPublicOffer(
      row({ drawdown_type: 'STATIC', drawdown_amount: 500, funded_drawdown_type: 'STATIC', funded_drawdown_amount: 800 }),
    );
    expect(o.fundedHardening.differs).toBe(true);
    expect(o.fundedHardening.drawdownAmount).toBe(800);
  });

  it('détecte un daily loss durci', () => {
    const o = toPublicOffer(row({ daily_loss_limit: 1_200, funded_daily_loss: 800 }));
    expect(o.fundedHardening.differs).toBe(true);
  });

  it('ne signale RIEN quand les règles funded sont identiques', () => {
    const o = toPublicOffer(
      row({ drawdown_type: 'EOD', funded_drawdown_type: 'EOD', drawdown_amount: 2_000, funded_drawdown_amount: 2_000 }),
    );
    expect(o.fundedHardening.differs).toBe(false);
  });
});

describe('cohérence — 100 % équivaut à aucune contrainte', () => {
  it('100 % n’est pas une contrainte', () => {
    expect(toPublicOffer(row({ consistency_pct: 100 })).hasConsistency).toBe(false);
  });
  it('null non plus', () => {
    expect(toPublicOffer(row({ consistency_pct: null })).hasConsistency).toBe(false);
  });
  it('40 % en est une', () => {
    expect(toPublicOffer(row({ consistency_pct: 40 })).hasConsistency).toBe(true);
  });
  it('le filtre « sans cohérence » garde les 100 % et écarte les 40 %', () => {
    const libre = toPublicOffer(row({ id: 'libre', consistency_pct: 100 }));
    const strict = toPublicOffer(row({ id: 'strict', consistency_pct: 40 }));
    expect(filterOffers([libre, strict], { noConsistency: true }).map((o) => o.id)).toEqual(['libre']);
  });
});

describe('confiance — vérification et promos', () => {
  it('sans reviewed_at, l’offre n’est pas vérifiée', () => {
    expect(toPublicOffer(row({ reviewed_at: null })).trust.verified).toBe(false);
  });

  it('une promo SANS date de fin est marquée permanente', () => {
    const o = toPublicOffer(row({ promo: { code: 'VAULT', discount_pct: 40, ends_at: null } }));
    expect(o.trust.promo?.permanent).toBe(true);
  });

  it('une promo datée ne l’est pas', () => {
    const o = toPublicOffer(row({ promo: { code: 'SAVENOW', discount_pct: 90, ends_at: '2026-07-29' } }));
    expect(o.trust.promo?.permanent).toBe(false);
  });

  it('le filtre « vérifiées seulement » écarte les non vérifiées', () => {
    const ok = toPublicOffer(row({ id: 'ok', reviewed_at: '2026-07-21' }));
    const ko = toPublicOffer(row({ id: 'ko', reviewed_at: null }));
    expect(filterOffers([ok, ko], { verifiedOnly: true }).map((o) => o.id)).toEqual(['ok']);
  });
});

describe('verrou du plancher', () => {
  it('absent en base = verrouillé (comportement dominant)', () => {
    expect(toPublicOffer(row({ drawdown_locks_at_breakeven: null })).drawdown.locksAtBreakeven).toBe(true);
  });
  it('false est respecté (Apex sur Tradovate)', () => {
    expect(toPublicOffer(row({ drawdown_locks_at_breakeven: false })).drawdown.locksAtBreakeven).toBe(false);
  });
});

describe('presets — les intentions d’arrivée', () => {
  const cheapNoCons = toPublicOffer(row({ id: 'cheap', price: 99, activation_fee: 0, consistency_pct: 100 }));
  const dearStrict = toPublicOffer(row({ id: 'dear', price: 700, activation_fee: 0, consistency_pct: 40 }));
  const hardened = toPublicOffer(
    row({ id: 'hardened', price: 120, activation_fee: 0, consistency_pct: 100, funded_drawdown_type: 'TRAIL' }),
  );
  const noPrice = toPublicOffer(row({ id: 'nop', price: null, consistency_pct: 100 }));
  const all = [cheapNoCons, dearStrict, hardened, noPrice];

  const apply = (key: string) => {
    const p = presetByKey(key)!;
    return sortOffers(filterOffers(all, p.filters), p.sort).map((o) => o.id);
  };

  it('« budget » garde le TTC sous 150 et écarte les prix inconnus', () => {
    expect(apply('budget')).toEqual(['cheap', 'hardened']);
  });

  it('« sans cohérence » écarte les 40 %, garde les 100 %', () => {
    expect(apply('no_consistency')).not.toContain('dear');
    expect(apply('no_consistency')).toContain('cheap');
  });

  it('« débutant » écarte AUSSI les offres qui durcissent en financé', () => {
    // Le point du preset : ne pas laisser un débutant découvrir un trailing
    // intraday après avoir passé son évaluation en EOD.
    const out = apply('beginner');
    expect(out).not.toContain('hardened');
    expect(out).toContain('cheap');
  });

  it('« meilleures notes » n’impose PAS « vérifiées seulement »', () => {
    // Mélanger la qualité de l'offre et l'état de NOTRE collecte serait trompeur.
    expect(presetByKey('top_rated')!.filters.verifiedOnly).toBeUndefined();
  });

  it('une clé inconnue ne renvoie rien plutôt que de filtrer au hasard', () => {
    expect(presetByKey('nimportequoi')).toBeNull();
  });
});

describe('facettes — ne proposer que des filtres qui servent', () => {
  it('agrège valeurs distinctes et compteurs d’honnêteté', () => {
    const offers = [
      toPublicOffer(row({ id: '1', account_size: 25_000, price: null, reviewed_at: null })),
      toPublicOffer(row({ id: '2', account_size: 50_000, drawdown_type: 'TRAIL', promo: { code: 'X', discount_pct: 40, ends_at: null } })),
      toPublicOffer(row({ id: '3', account_size: 50_000, funded_drawdown_type: 'TRAIL' })),
    ];
    const f = buildFacets(offers);
    expect(f.sizes).toEqual([25_000, 50_000]);
    expect(f.drawdownTypes).toEqual(['EOD', 'TRAIL']);
    expect(f.withoutPrice).toBe(1);
    expect(f.unverified).toBe(1);
    expect(f.withPermanentPromo).toBe(1);
    expect(f.withFundedHardening).toBe(1);
  });
});
