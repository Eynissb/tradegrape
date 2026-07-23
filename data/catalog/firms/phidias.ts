import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Phidias — collecte du 2026-07-21, après la refonte « Phidias 2.0 » (fin avril 2026).
 * Cas le plus flagrant de données périmées chez le concurrent : Static, Fundamental,
 * Swing et 10K Drawdown n'existent plus sous cette forme. « Static » est devenue
 * Express to Live (4 tailles au lieu d'une), « Swing » est devenue Premium.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // paiement unique ou mensuel au choix, sans activation en OTP
  activation_fee: 0,
  drawdown_locks_at_breakeven: true,
  consistency_pct: 100, // aucune cohérence en évaluation, toutes formules
  funded_consistency_pct: 30,
  daily_loss_limit: null, // aucun DLL
  funded_daily_loss: null,
  payout_min_amount: 500,
  payout_method: 'RISEWORKS',
  platforms: ['rithmic', 'dxfeed', 'tradovate', 'ninjatrader', 'tradingview'],
  price: null,
};

export const phidias: FirmSeed = {
  slug: 'phidias',
  name: 'Phidias Propfirm',
  collectedAt: '2026-07-21',
  country: 'GI',
  max_funded_accounts: 15,
  trustpilot_rating: 3.9,

  platforms: [
    { slug: 'rithmic', is_free: true },
    { slug: 'dxfeed', is_free: true, note: 'Donne l’accès EUREX.' },
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'tradingview', is_free: true },
  ],

  styleRules: [{ rule_key: 'news', stance: 'allowed', detail: 'Autorisées sur toutes les formules.' }],

  plans: [
    {
      slug: 'express-to-live',
      name: 'Phidias Express to Live',
      account_kind: 'evaluation',
      description: 'Drawdown STATIQUE qui ne bouge jamais, zéro jour minimum. Le premier payout convertit en compte live chez Dorman Trading.',
      offerDefaults: {
        ...BASE,
        drawdown_type: 'STATIC', funded_drawdown_type: 'STATIC',
        min_trading_days: 0,
        profit_split: 90,
        payout_frequency_days: 1,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 500, profit_target: 1_500, max_minis: 2, max_micros: 20, funded_max_minis: 2, funded_max_micros: 20, confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 650, profit_target: 2_500, confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'max_minis', 'price'], note: 'Drawdown et limites de contrats repris du concurrent.' },
        { account_size: 100_000, drawdown_amount: 800, profit_target: 3_500, confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'max_minis', 'price'], note: 'Drawdown et limites de contrats repris du concurrent.' },
        { account_size: 150_000, drawdown_amount: 1_000, profit_target: 4_500, confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'max_minis', 'price'], note: 'Drawdown et limites de contrats repris du concurrent.' },
      ],
    },
    {
      slug: 'fundamental',
      name: 'Phidias Fundamental',
      account_kind: 'evaluation',
      description: 'EOD, intraday uniquement. 10 jours entre payouts.',
      offerDefaults: {
        ...BASE,
        drawdown_type: 'EOD', funded_drawdown_type: 'EOD',
        min_trading_days: 3,
        profit_split: 80,
        payout_frequency_days: 10,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        { account_size: 50_000, drawdown_amount: 2_500, profit_target: 4_000, max_minis: 10, max_micros: 100, funded_max_minis: 10, funded_max_micros: 100, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 14, max_micros: 140, funded_max_minis: 14, funded_max_micros: 140, confidence: 'verified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, max_minis: 17, max_micros: 170, funded_max_minis: 17, funded_max_micros: 170, confidence: 'verified' },
      ],
    },
    {
      slug: 'premium',
      name: 'Phidias Premium',
      account_kind: 'evaluation',
      description: 'Overnight et week-end autorisés. Split PROGRESSIF de 75 % à 100 % sur les cinq premiers payouts.',
      offerDefaults: {
        ...BASE,
        drawdown_type: 'EOD', funded_drawdown_type: 'EOD',
        min_trading_days: 3,
        profit_split: 75, // valeur de DÉPART du palier
        payout_model: 'progressive',
        payout_frequency_days: 5,
        confidence: 'verified',
        unverifiedFields: ['price'],
      },
      offers: [
        { account_size: 50_000, drawdown_amount: 2_500, profit_target: 4_000, max_minis: 10, max_micros: 100, funded_max_minis: 10, funded_max_micros: 100, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 14, max_micros: 140, funded_max_minis: 14, funded_max_micros: 140, confidence: 'verified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, max_minis: 17, max_micros: 170, funded_max_minis: 17, funded_max_micros: 170, confidence: 'verified' },
      ],
      /** Split progressif sur les cinq premiers payouts (§12 #3). */
      payoutCaps: [
        { cycle_from: 1, cycle_to: 1, split_pct: 75, note: 'Palier progressif Premium' },
        { cycle_from: 2, cycle_to: 2, split_pct: 80, note: 'Palier progressif Premium' },
        { cycle_from: 3, cycle_to: 3, split_pct: 85, note: 'Palier progressif Premium' },
        { cycle_from: 4, cycle_to: 4, split_pct: 90, note: 'Palier progressif Premium' },
        { cycle_from: 5, cycle_to: null, split_pct: 100, note: 'Palier progressif Premium — 100 % à partir du 5e' },
      ],
    },
  ],

  engineCaveats: [
    'Split progressif Premium (75 → 100 % sur cinq payouts) saisi dans les plafonds. La RÉPARTITION exacte entre les paliers 2 à 4 est interpolée : seuls les bornes 75 % et 100 % sont établies.',
    'Overnight et week-end autorisés sur Premium : `overnight_allowed`/`weekend_allowed` vivent au niveau FIRM, pas du plan — non renseignés pour éviter de généraliser à Fundamental.',
  ],
  riskFlags: [
    'Trustpilot 3,9/5 avec un groupe notable d’avis 1 étoile sur des DÉSACTIVATIONS DE COMPTES et des problèmes de flux de données. À intégrer au health score.',
  ],
};
