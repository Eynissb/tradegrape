import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Alpha Futures — collecte du 2026-07-21.
 *
 * 🚨 FIRM EN CRISE OUVERTE. Événements du 2026-07-12 (neuf jours avant collecte) :
 *  - NinjaTrader met fin au partenariat, entraînant Tradovate : plus aucun
 *    nouveau compte sur les deux plateformes les plus utilisées du secteur ;
 *  - le plan Premium est supprimé, Alpha reconnaissant 25 M$ payés à perte ;
 *  - les payouts DUS et impayés sont convertis en REMBOURSEMENTS de compte,
 *    puis annoncés « par lots », le premier lot à 10 % des montants dus ;
 *  - un comparateur espagnol l'a retirée de son classement et de ses codes promo.
 *
 * `health_score` au plancher et `is_published = false` : cette firm ne doit pas
 * être proposée sans arbitrage humain explicite.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false,
  activation_fee: 0,
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillé au capital initial
  profit_split: 90,
  payout_model: 'fixed_cap',
  payout_min_days: 5,
  payout_daily_threshold: 200, // 5 jours gagnants à 200 $ minimum
  platforms: ['alphatrader'], // NinjaTrader et Tradovate PERDUS le 2026-07-12
  price: null,
  confidence: 'unverified',
  unverifiedFields: ['price'],
  note: 'Firm en restructuration : paramètres susceptibles de changer sans préavis.',
};

export const alphaFutures: FirmSeed = {
  slug: 'alpha-futures',
  name: 'Alpha Futures',
  collectedAt: '2026-07-21',

  /* Plancher assumé : perte des plateformes principales, suppression d'un plan,
     et surtout conversion de payouts dus en remboursements. */
  health_score: 5,
  health_breakdown: {
    plateformes: 'NinjaTrader et Tradovate perdus le 2026-07-12 — AlphaTrader seule',
    payouts: 'payouts dus convertis en remboursements, puis versés par lots (1er lot = 10 %)',
    stabilite_offre: 'plan Premium supprimé ; plan Standard retiré le 2026-05-01',
    reputation: 'retirée du classement et des codes promo d’un comparateur espagnol',
    evalue_le: '2026-07-21',
  },

  platforms: [
    { slug: 'alphatrader', is_free: true, note: 'Seule plateforme restante depuis le 2026-07-12.' },
  ],

  plans: [
    {
      slug: 'zero',
      name: 'Alpha Zero',
      account_kind: 'evaluation',
      description: 'Aucune cohérence en évaluation, 40 % en compte qualifié.',
      offerDefaults: { ...BASE, consistency_pct: 100, funded_consistency_pct: 40, min_trading_days: 1 },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'unverified' },
      ],
    },
    {
      slug: 'advanced',
      name: 'Alpha Advanced',
      account_kind: 'evaluation',
      description: 'Cohérence 50 % en évaluation, aucune une fois qualifié. Retrait minimum 1 000 $.',
      offerDefaults: {
        ...BASE, consistency_pct: 50, funded_consistency_pct: 100,
        min_trading_days: 3, payout_min_amount: 1_000,
      },
      offers: [
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, confidence: 'unverified' },
      ],
    },
  ],

  engineCaveats: [
    'Retrait de 50 % des profits par demande, ou 100 % mais cela FERME le compte : arbitrage non modélisable — `evaluatePayout` ne connaît pas de retrait destructif.',
  ],
  riskFlags: [
    '🚨 2026-07-12 : NinjaTrader met fin au partenariat, Tradovate suit. Plus aucun nouveau compte sur ces plateformes.',
    '🚨 Plan Premium SUPPRIMÉ ; payouts dus convertis en remboursements, puis annoncés par lots (1er lot = 10 % des montants dus).',
    '🚨 Retirée du classement, du comparateur et des codes promo d’un comparateur espagnol, avec effet immédiat.',
    'Plan Standard retiré le 2026-05-01.',
    'Le comparateur concurrent affiche encore « Tradovate/NT, DxFeed » et les plans Zero, Premium et Advanced : ses données ont neuf jours de retard.',
  ],
};
