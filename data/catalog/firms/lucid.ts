import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Lucid Trading — règles ET prix vérifiés sur lucidtrading.com le 2026-07-24.
 *
 * L'INVERSION de cohérence est confirmée par la page elle-même : les cartes
 * Flex portent la mention « No Consistency in Funded ✓ » alors qu'elles
 * affichent 50 % en évaluation ; Pro fait l'inverse (aucune en éval, 40 % en
 * financé). Le comparateur concurrent n'affichait que la valeur d'évaluation.
 *
 * PRIX : chaque carte affiche un prix barré puis un prix « W/ COUPON AT
 * CHECKOUT » (code VAULT, ~-40 %). `price` porte le tarif de BASE.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // « One Time Payment » confirmé sur chaque carte
  activation_fee: 0, // « Account Activation Fee : FREE » confirmé
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true,
  profit_split: 90,
  platforms: ['rithmic', 'tradovate', 'ninjatrader'],
  confidence: 'verified',
  note: 'Règles et prix vérifiés sur lucidtrading.com le 2026-07-24. Prix = tarif de base ; ~-40 % avec le code VAULT au checkout.',
};

/** Buffer Lucid = capital + drawdown + 100 (Pro et Direct). */
const buffer = (size: number, dd: number) => size + dd + 100;

export const lucid: FirmSeed = {
  slug: 'lucid-trading',
  name: 'Lucid Trading',
  collectedAt: '2026-07-21',
  daily_flat_time: '16:45 America/New_York',
  trustpilot_rating: 4.8,

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
        consistency_pct: 100, // aucune en évaluation
        funded_consistency_pct: 40,
        min_trading_days: 1,
        payout_model: 'buffer_then_free',
        // La cohérence funded (40 %) vit derrière le lien « Funded Rules »,
        // non relue sur cette page.
        unverifiedFields: ['funded_consistency_pct'],
      },
      offers: [
        { account_size: 25_000, price: 135, drawdown_amount: 1_000, profit_target: 1_250, daily_loss_limit: null, max_minis: 2, max_micros: 20, payout_buffer: buffer(25_000, 1_000), confidence: 'verified' },
        { account_size: 50_000, price: 185, drawdown_amount: 2_000, profit_target: 3_000, daily_loss_limit: 1_200, funded_daily_loss: 1_200, max_minis: 4, max_micros: 40, payout_buffer: buffer(50_000, 2_000), confidence: 'verified' },
        { account_size: 100_000, price: 285, drawdown_amount: 3_000, profit_target: 6_000, daily_loss_limit: 1_800, funded_daily_loss: 1_800, max_minis: 6, max_micros: 60, payout_buffer: buffer(100_000, 3_000), confidence: 'verified' },
        { account_size: 150_000, price: 370, drawdown_amount: 4_500, profit_target: 9_000, daily_loss_limit: 2_700, funded_daily_loss: 2_700, max_minis: 10, max_micros: 100, payout_buffer: buffer(150_000, 4_500), confidence: 'verified' },
      ],
    },
    {
      slug: 'flex',
      name: 'LucidFlex',
      account_kind: 'evaluation',
      description: 'Le plus permissif en financé : la carte officielle porte « No Consistency in Funded ✓ ». Aucun DLL. 5 jours profitables requis.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 50,
        funded_consistency_pct: 100, // aucune en financé — confirmé sur la carte
        min_trading_days: 2,
        daily_loss_limit: null, // « Daily Loss Limit : NONE » confirmé
        funded_daily_loss: null,
        payout_model: 'fixed_cap',
        payout_min_days: 5,
      },
      offers: [
        { account_size: 25_000, price: 100, drawdown_amount: 1_000, profit_target: 1_250, max_minis: 2, max_micros: 20, confidence: 'verified' },
        { account_size: 50_000, price: 140, drawdown_amount: 2_000, profit_target: 3_000, max_minis: 4, max_micros: 40, confidence: 'verified' },
        { account_size: 100_000, price: 225, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 6, max_micros: 60, confidence: 'verified' },
        { account_size: 150_000, price: 420, drawdown_amount: 4_500, profit_target: 9_000, max_minis: 10, max_micros: 100, confidence: 'verified' },
      ],
    },
    {
      slug: 'direct',
      name: 'LucidDirect',
      account_kind: 'direct',
      description: 'Financement instantané, sans évaluation. Cohérence 20 %, 5 jours minimum avant payout, 5 comptes max.',
      offerDefaults: {
        ...BASE,
        profit_target: null,
        consistency_pct: 20,
        funded_consistency_pct: 20,
        payout_min_days: 5,
        payout_model: 'buffer_then_free',
      },
      offers: [
        { account_size: 25_000, price: 340, drawdown_amount: 1_000, daily_loss_limit: null, max_minis: 2, max_micros: 20, payout_buffer: buffer(25_000, 1_000), confidence: 'verified' },
        { account_size: 50_000, price: 520, drawdown_amount: 2_000, daily_loss_limit: 1_200, funded_daily_loss: 1_200, max_minis: 4, max_micros: 40, payout_buffer: buffer(50_000, 2_000), confidence: 'verified' },
        // Drawdowns 3 500 et 5 000 : ils venaient du concurrent, ils sont confirmés.
        { account_size: 100_000, price: 700, drawdown_amount: 3_500, daily_loss_limit: 2_100, funded_daily_loss: 2_100, max_minis: 6, max_micros: 60, payout_buffer: buffer(100_000, 3_500), confidence: 'verified' },
        { account_size: 150_000, price: 840, drawdown_amount: 5_000, daily_loss_limit: 3_000, funded_daily_loss: 3_000, max_minis: 10, max_micros: 100, payout_buffer: buffer(150_000, 5_000), confidence: 'verified' },
      ],
    },
  ],

  engineCaveats: [
    'LucidDirect applique un SECOND DLL au-dessus du trail initial (« LucidScale DLL : 60 % of Peak EOD Balance ») en plus du DLL fixe. Le schéma ne porte qu’une valeur : seul le DLL fixe est saisi, le moteur sera donc plus permissif au-dessus du trail.',
    'Plafonds de payout par taille non publiés : `offer_payout_caps` reste vide, `evaluatePayout` n’appliquera aucun plafond de montant.',
    'Condition de payout Pro (« objectif + 3 jours calendaires depuis le financement ») non modélisable : le moteur compte des jours de PROFIT, pas des jours calendaires depuis un événement.',
    'Frais de reset relevés (60 à 280 $ selon plan et taille) : aucune colonne `reset_fee` au schéma (§12 #9).',
  ],
  riskFlags: [
    '[PROMO] Remise permanente affichée : prix barré puis « W/ COUPON AT CHECKOUT », code VAULT (~-40 %) sur chaque carte (relevé 2026-07-24). AUCUNE date de fin. Prix catalogue = tarif de base.',
    'LucidMaxx (payouts quotidiens) et LucidLive (étape 3 du parcours officiel, retraits quotidiens, capital réel) ne sont pas collectés.',
    'LucidBlack fermé aux nouvelles inscriptions, fonctionnalités reversées dans Pro et Maxx.',
  ],
};
