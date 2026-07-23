import { describe, expect, it } from 'vitest';
import { reviewedAtFor, unverifiedRuleFields, validateAll, resolveOffer } from './validate';
import type { FirmSeed, OfferSeed } from './types';

const PLATFORMS = ['rithmic', 'tradovate'];

function firm(over: Partial<FirmSeed> = {}): FirmSeed {
  return {
    slug: 'demo-firm',
    name: 'Demo',
    collectedAt: '2026-07-21',
    plans: [
      {
        slug: 'eval',
        name: 'Eval',
        offers: [
          { account_size: 50_000, drawdown_type: 'EOD', drawdown_amount: 2_000, price: 100, confidence: 'verified' },
        ],
      },
    ],
    ...over,
  };
}

const offer = (o: Partial<OfferSeed> = {}): OfferSeed =>
  ({ account_size: 50_000, drawdown_type: 'EOD', drawdown_amount: 2_000, confidence: 'verified', ...o }) as OfferSeed;

describe('reviewedAtFor — ce qui entre dans la file de revérification', () => {
  it('offre vérifiée sans réserve → date de collecte', () => {
    expect(reviewedAtFor(firm(), offer())).toBe('2026-07-21');
  });

  it('offre non vérifiée → null', () => {
    expect(reviewedAtFor(firm(), offer({ confidence: 'unverified' }))).toBeNull();
  });

  it('un champ de RÈGLE douteux annule la vérification', () => {
    expect(reviewedAtFor(firm(), offer({ unverifiedFields: ['drawdown_amount'] }))).toBeNull();
  });

  it('un prix inconnu n’annule PAS la vérification des règles', () => {
    // Sinon `where reviewed_at is null` se remplit de faux positifs : on croirait
    // que le drawdown est à revérifier alors que seul le prix manque.
    expect(reviewedAtFor(firm(), offer({ unverifiedFields: ['price'] }))).toBe('2026-07-21');
    expect(reviewedAtFor(firm(), offer({ unverifiedFields: ['price', 'activation_fee'] }))).toBe('2026-07-21');
  });

  it('mélange commercial + règle → la règle l’emporte', () => {
    expect(reviewedAtFor(firm(), offer({ unverifiedFields: ['price', 'consistency_pct'] }))).toBeNull();
    expect(unverifiedRuleFields(offer({ unverifiedFields: ['price', 'consistency_pct'] }))).toEqual(['consistency_pct']);
  });

  it('chaque firm porte SA date de collecte', () => {
    expect(reviewedAtFor(firm({ collectedAt: '2026-07-12' }), offer())).toBe('2026-07-12');
  });
});

describe('validateAll — refuse ce qui produirait une donnée fausse', () => {
  const errs = (f: FirmSeed) => validateAll([f], PLATFORMS).filter((i) => i.level === 'error').map((i) => i.message);

  it('une collecte saine ne lève aucune erreur', () => {
    expect(errs(firm())).toEqual([]);
  });

  it('price = 0 est refusé : 0 signifie gratuit, pas inconnu', () => {
    const f = firm();
    f.plans[0].offers[0].price = 0;
    expect(errs(f).join()).toMatch(/price = 0/);
  });

  it('taille dupliquée dans un plan (violerait unique(plan_id, account_size))', () => {
    const f = firm();
    f.plans[0].offers.push({ account_size: 50_000, drawdown_type: 'EOD', drawdown_amount: 2_000, confidence: 'verified' });
    expect(errs(f).join()).toMatch(/dupliquée/);
  });

  it('slug de plan dupliqué (violerait unique(firm_id, slug))', () => {
    const f = firm();
    f.plans.push({ ...f.plans[0] });
    expect(errs(f).join()).toMatch(/plan dupliqué/);
  });

  it('plateforme hors catalogue', () => {
    const f = firm();
    f.plans[0].offers[0].platforms = ['inconnue'];
    expect(errs(f).join()).toMatch(/absente du catalogue/);
  });

  it('drawdown_type invalide', () => {
    const f = firm();
    (f.plans[0].offers[0] as { drawdown_type: string }).drawdown_type = 'INTRADAY';
    expect(errs(f).join()).toMatch(/drawdown_type/);
  });

  it('pourcentage hors bornes', () => {
    const f = firm();
    f.plans[0].offers[0].profit_split = 140;
    expect(errs(f).join()).toMatch(/hors \[0,100\]/);
  });

  it('deux plafonds sur le même (variante, cycle)', () => {
    const f = firm();
    f.plans[0].payoutCaps = [
      { variant: 'standard', cycle_from: 1, max_amount: 2_000 },
      { variant: 'standard', cycle_from: 1, max_amount: 3_000 },
    ];
    expect(errs(f).join()).toMatch(/plafond dupliqué/);
  });

  it('deux VARIANTES peuvent partager le même cycle', () => {
    const f = firm();
    f.plans[0].payoutCaps = [
      { variant: 'standard', cycle_from: 1, max_amount: 2_000 },
      { variant: 'consistency', cycle_from: 1, max_amount: 3_000 },
    ];
    expect(errs(f)).toEqual([]);
  });
});

describe('resolveOffer — les valeurs par défaut du plan complètent l’offre', () => {
  it('l’offre écrase le défaut, le défaut comble le reste', () => {
    const plan = {
      slug: 'p', name: 'P',
      offerDefaults: { drawdown_type: 'EOD' as const, consistency_pct: 50, currency: 'USD' },
      offers: [],
    };
    const r = resolveOffer(plan, { account_size: 50_000, consistency_pct: 40, confidence: 'verified' });
    expect(r.drawdown_type).toBe('EOD');
    expect(r.consistency_pct).toBe(40);
    expect(r.currency).toBe('USD');
  });
});
