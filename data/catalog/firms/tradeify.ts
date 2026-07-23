import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Tradeify — collecte du 2026-07-21 (Help Center officiel).
 * Cohérence : 40 % Select en évaluation, 35 % Growth en FINANCÉ,
 * et 20 → 25 → 30 % pour Lightning selon le numéro de payout (§12 #4).
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // paiement unique depuis Tradeify 3.0
  activation_fee: 0,
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillé à drawdown + 100
  profit_split: 90,
  payout_model: 'fixed_cap',
  platforms: ['rithmic', 'tradovate', 'ninjatrader', 'wealthcharts'],
  price: null,
};

export const tradeify: FirmSeed = {
  slug: 'tradeify',
  name: 'Tradeify',
  collectedAt: '2026-07-21',
  max_funded_accounts: 5,

  platforms: [
    { slug: 'rithmic', is_free: true },
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'wealthcharts', is_free: true },
  ],

  plans: [
    {
      slug: 'growth',
      name: 'Tradeify Growth',
      account_kind: 'evaluation',
      description: 'Aucune cohérence en évaluation, 35 % en compte financé.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 100,
        funded_consistency_pct: 35,
        min_trading_days: 1,
        payout_min_days: 5,
        confidence: 'unverified',
        unverifiedFields: ['drawdown_amount', 'price'],
        note: 'Drawdowns repris du comparateur concurrent, pas de source officielle.',
      },
      offers: [
        {
          account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500,
          daily_loss_limit: 600, funded_daily_loss: 600, payout_buffer: 26_500,
          confidence: 'unverified',
          note: 'DLL 600 confirmé sur cette taille uniquement ; drawdown du concurrent.',
        },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified', note: 'DLL inconnu à cette taille.' },
        { account_size: 100_000, drawdown_amount: 3_500, profit_target: 6_000, confidence: 'unverified', note: 'DLL inconnu à cette taille.' },
        { account_size: 150_000, drawdown_amount: 5_000, profit_target: 9_000, confidence: 'unverified', note: 'DLL inconnu à cette taille.' },
      ],
    },
    {
      slug: 'select',
      name: 'Tradeify Select',
      account_kind: 'evaluation',
      description: 'Cohérence 40 % en évaluation, aucune en financé. Se divise ensuite en deux chemins PERMANENTS : Flex ou Daily.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 40,
        funded_consistency_pct: 100, // aucune en financé
        min_trading_days: 3,
        payout_min_days: 5,
        payout_daily_threshold: 100,
        confidence: 'unverified',
        unverifiedFields: ['drawdown_amount', 'price'],
        note: 'Drawdowns repris du comparateur concurrent.',
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, confidence: 'unverified' },
      ],
      /** Deux chemins permanents après passage (§12 #5). */
      payoutCaps: [
        { variant: 'flex', cycle_from: 1, cycle_to: null, max_pct: 50, max_amount: 1_250, min_profit_days: 5, note: 'Flex — 1 contrat max, plafond 50 % jusqu’à 1 250' },
        { variant: 'daily', cycle_from: 1, cycle_to: null, max_amount: 600, note: 'Daily — DLL 500, buffer 1 100, plafond 2× profits jusqu’à 600' },
      ],
    },
    {
      slug: 'lightning',
      name: 'Tradeify Lightning',
      account_kind: 'direct',
      description: 'Financement direct. Cohérence PROGRESSIVE selon le numéro de payout : 20 % puis 25 % puis 30 %.',
      offerDefaults: {
        ...BASE,
        profit_target: null,
        consistency_pct: 20,
        funded_consistency_pct: 20,
        payout_model: 'progressive',
        confidence: 'unverified',
        unverifiedFields: ['drawdown_amount', 'price'],
        note: 'Drawdowns repris du comparateur concurrent.',
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 4_000, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 6_000, confidence: 'unverified' },
      ],
      /** Cohérence progressive par numéro de payout (§12 #4) — certaine. */
      payoutCaps: [
        { cycle_from: 1, cycle_to: 1, consistency_pct: 20, note: '1er payout' },
        { cycle_from: 2, cycle_to: 2, consistency_pct: 25, note: '2e payout' },
        { cycle_from: 3, cycle_to: null, consistency_pct: 30, note: '3e payout et suivants' },
      ],
    },
  ],

  engineCaveats: [
    'Select se divise en deux chemins PERMANENTS (Flex / Daily) après passage : saisis en `variant`, mais le moteur ne fige pas encore la variante choisie au snapshot du compte (§12 #5).',
    'Lightning a une cohérence PROGRESSIVE par numéro de payout : saisie dans les plafonds, mais `evaluatePayout` lit la cohérence funded scalaire (§12 #4).',
    'Split possiblement à 100 % sur les 15 000 premiers dollars cumulés chez Growth, puis 90 % — une seule source, non saisi.',
    'Transition vers un compte Live après le 4e payout ou 80 000 $ cumulés : non modélisé.',
  ],
  riskFlags: [
    'Un « Advanced Challenge » figure au contrat officiel mais n’apparaît dans aucun comparateur — non collecté.',
  ],
};
