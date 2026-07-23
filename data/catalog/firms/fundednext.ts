import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * FundedNext — collecte du 2026-07-21.
 *
 * ⚠️ COHÉRENCE LAISSÉE À `null` sur Flex et Legacy. FundedNext calcule le
 * meilleur jour sur l'OBJECTIF DE PROFIT, pas sur le profit total — et un
 * dépassement AUGMENTE l'objectif au lieu de faire échouer (§12 #6, même
 * mécanisme que Take Profit Trader). Notre moteur compare au profit total et
 * signalerait une infraction : un faux positif sur un outil de gestion du
 * risque est pire qu'une donnée absente.
 *
 * « Bolt » est arrêté pour les nouveaux achats, remplacé par « Rapid Daily ».
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // paiement unique, aucun abonnement, aucune activation
  activation_fee: 0,
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillé au capital initial
  daily_loss_limit: null, // aucun DLL
  funded_daily_loss: null,
  min_trading_days: 0, // aucun jour minimum
  funded_consistency_pct: 100, // cohérence supprimée en financé, y compris Legacy depuis 2026
  payout_model: 'fixed_cap',
  platforms: ['tradovate', 'ninjatrader', 'tradingview'],
  price: null,
};

export const fundednext: FirmSeed = {
  slug: 'fundednext',
  name: 'FundedNext',
  collectedAt: '2026-07-21',
  country: 'AE',
  hq_city: 'Dubaï',
  daily_flat_time: '15:10 America/Chicago',
  weekend_allowed: false,

  platforms: [
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'tradingview', is_free: true },
  ],

  plans: [
    {
      slug: 'flex',
      name: 'FundedNext Flex',
      account_kind: 'evaluation',
      description: 'Option payante 80 % → 90 % de split (non modélisée). Cohérence 40 % calculée sur l’objectif.',
      offerDefaults: {
        ...BASE,
        consistency_pct: null, // cf. §12 #6
        profit_split: 80,
        payout_min_days: 5,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 2_500, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 2_500, profit_target: 5_000, confidence: 'verified' },
        { account_size: 150_000, drawdown_amount: 4_000, profit_target: 8_000, confidence: 'verified' },
      ],
    },
    {
      slug: 'legacy',
      name: 'FundedNext Legacy',
      account_kind: 'evaluation',
      description: 'Aligné sur 4 % du capital depuis 2026 (drawdown 50k 2 500 → 2 000, objectif 25k 1 250).',
      offerDefaults: {
        ...BASE,
        consistency_pct: null, // cf. §12 #6
        profit_split: 80,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_250, confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'verified' },
      ],
    },
    {
      slug: 'rapid-daily',
      name: 'FundedNext Rapid Daily',
      account_kind: 'evaluation',
      description: 'Remplaçant de Bolt. Aucune cohérence, aucun jour de référence, retraits quotidiens, split 90 %.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 100, // aucune cohérence — valeur réelle, pas une réserve
        profit_split: 90,
        payout_frequency_days: 1,
        payout_min_days: 0,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        {
          account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500,
          max_minis: 2, max_micros: 20, funded_max_minis: 2, funded_max_micros: 20, confidence: 'verified',
          payoutCaps: [{ cycle_from: 1, cycle_to: null, max_amount: 800, note: 'Plafond Rapid Daily 25k' }],
        },
        {
          account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000,
          max_minis: 4, max_micros: 40, funded_max_minis: 4, funded_max_micros: 40, confidence: 'verified',
          payoutCaps: [{ cycle_from: 1, cycle_to: null, max_amount: 1_200, note: 'Plafond Rapid Daily 50k' }],
        },
        {
          account_size: 100_000, drawdown_amount: 2_500, profit_target: 5_000,
          max_minis: 6, max_micros: 60, funded_max_minis: 6, funded_max_micros: 60, confidence: 'verified',
          payoutCaps: [{ cycle_from: 1, cycle_to: null, max_amount: 2_500, note: 'Plafond Rapid Daily 100k' }],
        },
      ],
    },
  ],

  engineCaveats: [
    'Cohérence calculée sur l’OBJECTIF de profit, et un dépassement RELÈVE l’objectif au lieu de faire échouer (§12 #6). `consistency_pct` laissé à `null` sur Flex et Legacy plutôt que d’afficher un faux positif.',
    'Option payante 80 % → 90 % de split sur Flex (§12 #8, parké) : non saisie.',
  ],
  riskFlags: [
    '« Bolt » arrêté pour les nouveaux achats : les données du comparateur concurrent restent valables pour les comptes existants mais sont périmées à l’achat.',
  ],
};
