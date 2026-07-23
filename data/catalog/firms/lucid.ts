import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Lucid Trading — collecte du 2026-07-21.
 *
 * ⚠️ La cohérence S'INVERSE entre évaluation et financé, et le comparateur
 * concurrent n'affiche que la valeur d'évaluation :
 *   Pro   → AUCUNE en évaluation, 40 % en financé
 *   Flex  → 50 % en évaluation, AUCUNE en financé
 *   Direct→ 20 % partout
 * (100 = désactivée côté moteur.)
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // paiement unique, aucun abonnement
  activation_fee: 0,
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillage une fois le solde initial dépassé
  profit_split: 90,
  platforms: ['rithmic', 'tradovate', 'ninjatrader'],
  price: null,
};

/** Buffer Lucid = capital + drawdown + 100 (Pro et Direct). */
const buffer = (size: number, dd: number) => size + dd + 100;

export const lucid: FirmSeed = {
  slug: 'lucid-trading',
  name: 'Lucid Trading',
  collectedAt: '2026-07-21',
  daily_flat_time: '16:45 America/New_York',

  platforms: [
    { slug: 'rithmic', is_free: true },
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
  ],

  styleRules: [
    { rule_key: 'news', stance: 'allowed', detail: 'Aucune restriction, y compris NFP, FOMC et CPI.' },
    { rule_key: 'scalping', stance: 'allowed', detail: 'Aucune durée minimale de tenue.' },
  ],

  plans: [
    {
      slug: 'pro',
      name: 'LucidPro',
      account_kind: 'evaluation',
      description: 'Aucune cohérence en évaluation, 40 % en compte financé. Payout : objectif atteint + 3 jours calendaires depuis le financement.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 100,
        funded_consistency_pct: 40,
        min_trading_days: 1,
        payout_model: 'buffer_then_free',
        confidence: 'verified',
        unverifiedFields: ['price', 'max_minis', 'max_micros'],
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_250, payout_buffer: buffer(25_000, 1_000), confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, payout_buffer: buffer(50_000, 2_000), confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, payout_buffer: buffer(100_000, 3_000), confidence: 'verified' },
        {
          account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, payout_buffer: buffer(150_000, 4_500),
          confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'price'],
          note: 'Drawdown 150k repris du comparateur concurrent.',
        },
      ],
    },
    {
      slug: 'flex',
      name: 'LucidFlex',
      account_kind: 'evaluation',
      description: 'Le plus permissif en financé : aucune cohérence après financement. 5 jours profitables requis.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 50,
        funded_consistency_pct: 100, // aucune en financé
        min_trading_days: 2,
        daily_loss_limit: null, // aucun DLL sur Flex
        payout_model: 'fixed_cap',
        payout_min_days: 5,
        confidence: 'verified',
        unverifiedFields: ['price', 'max_minis', 'max_micros'],
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_250, confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'verified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, confidence: 'verified' },
        {
          account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000,
          confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'price'],
          note: 'Drawdown 150k repris du comparateur concurrent.',
        },
      ],
    },
    {
      slug: 'direct',
      name: 'LucidDirect',
      account_kind: 'direct',
      description: 'Financement instantané, sans évaluation. Payout : objectif + cohérence 20 %.',
      offerDefaults: {
        ...BASE,
        profit_target: null, // compte direct
        consistency_pct: 20,
        funded_consistency_pct: 20,
        confidence: 'verified',
        unverifiedFields: ['price', 'max_minis', 'max_micros'],
      },
      offers: [
        { account_size: 25_000, drawdown_amount: 1_000, payout_buffer: buffer(25_000, 1_000), confidence: 'verified' },
        { account_size: 50_000, drawdown_amount: 2_000, payout_buffer: buffer(50_000, 2_000), confidence: 'verified' },
        {
          account_size: 100_000, drawdown_amount: 3_500, payout_buffer: buffer(100_000, 3_500),
          confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'price'],
          note: 'Drawdown repris du concurrent (3 500, hors schéma habituel).',
        },
        {
          account_size: 150_000, drawdown_amount: 5_000, payout_buffer: buffer(150_000, 5_000),
          confidence: 'unverified', unverifiedFields: ['drawdown_amount', 'price'],
          note: 'Drawdown repris du concurrent (5 000, hors schéma habituel).',
        },
      ],
    },
  ],

  engineCaveats: [
    'Plafonds de payout par taille non trouvés : `offer_payout_caps` reste vide, donc `evaluatePayout` n’appliquera aucun plafond de montant.',
    'Condition de payout Pro (« objectif + 3 jours calendaires depuis le financement ») non modélisable : le moteur compte des jours de PROFIT, pas des jours calendaires depuis un événement.',
  ],
  riskFlags: [
    'LucidMaxx (payouts quotidiens) et LucidLive (débloqué après 6 payouts, swing autorisé) ne sont pas collectés.',
    'LucidBlack fermé aux nouvelles inscriptions, fonctionnalités reversées dans Pro et Maxx.',
  ],
};
