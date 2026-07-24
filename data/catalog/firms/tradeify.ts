import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Tradeify — règles ET prix vérifiés sur tradeify.co le 2026-07-24.
 *
 * La page confirme les trois mécanismes que la collecte signalait :
 *  - Growth : AUCUNE cohérence en évaluation, 35 % en financé ;
 *  - Select : 40 % en évaluation, AUCUNE en financé, puis deux chemins
 *    PERMANENTS (Daily / Flex) avec plafonds et DLL propres à chaque taille ;
 *  - Lightning : cohérence PROGRESSIVE, l'infobulle officielle disant
 *    « moves to 25% for Payout 2 and 30% for Payout 3+ ».
 *
 * PRIX : le site affiche « 40% OFF » en permanence, prix barré → prix remisé,
 * avec la mention « Save $X with code JULY ». Le tarif remisé dépend donc d'un
 * code : `price` porte le tarif de BASE, le code vit dans `promo_codes`.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false, // « one time payment » confirmé sur chaque carte
  activation_fee: 0, // « Activation Fee : None » confirmé
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true,
  profit_split: 90,
  payout_model: 'fixed_cap',
  platforms: ['rithmic', 'tradovate', 'ninjatrader', 'wealthcharts'],
  confidence: 'verified',
  note: 'Règles et prix vérifiés sur tradeify.co le 2026-07-24. Prix = tarif de base ; -40 % avec le code JULY.',
};

export const tradeify: FirmSeed = {
  slug: 'tradeify',
  name: 'Tradeify',
  collectedAt: '2026-07-21',
  max_funded_accounts: 5, // « Max Accounts : 5 » confirmé

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
      description: 'Aucune cohérence en évaluation, 35 % en compte financé. Le DLL remonte au niveau du drawdown une fois 6 % de profit atteint.',
      offerDefaults: {
        ...BASE,
        consistency_pct: 100, // aucune en évaluation
        funded_consistency_pct: 35,
        min_trading_days: 1,
        payout_min_days: 5,
      },
      offers: [
        { account_size: 25_000, price: 99, drawdown_amount: 1_000, profit_target: 1_500, daily_loss_limit: 600, funded_daily_loss: 600, max_minis: 1, max_micros: 10, funded_max_minis: 1, funded_max_micros: 10, confidence: 'verified' },
        { account_size: 50_000, price: 145, drawdown_amount: 2_000, profit_target: 3_000, daily_loss_limit: 1_250, funded_daily_loss: 1_250, max_minis: 4, max_micros: 40, funded_max_minis: 4, funded_max_micros: 40, confidence: 'verified' },
        { account_size: 100_000, price: 255, drawdown_amount: 3_500, profit_target: 6_000, daily_loss_limit: 2_500, funded_daily_loss: 2_500, max_minis: 8, max_micros: 80, funded_max_minis: 8, funded_max_micros: 80, confidence: 'verified' },
        { account_size: 150_000, price: 369, drawdown_amount: 5_000, profit_target: 9_000, daily_loss_limit: 3_750, funded_daily_loss: 3_750, max_minis: 12, max_micros: 120, funded_max_minis: 12, funded_max_micros: 120, confidence: 'verified' },
      ],
    },
    {
      slug: 'select',
      name: 'Tradeify Select',
      account_kind: 'evaluation',
      description: 'Cohérence 40 % en évaluation, aucune en financé. Deux chemins PERMANENTS après passage : Daily (payouts quotidiens, DLL) ou Flex (5 jours, plafond plus haut).',
      offerDefaults: {
        ...BASE,
        consistency_pct: 40,
        funded_consistency_pct: 100, // aucune en financé
        min_trading_days: 3,
        payout_min_days: 5,
      },
      /* Plafonds et DLL par TAILLE et par chemin — relevés carte par carte. */
      offers: [
        {
          account_size: 25_000, price: 109, drawdown_amount: 1_000, profit_target: 1_500,
          max_minis: 1, max_micros: 10, funded_max_minis: 1, funded_max_micros: 10, confidence: 'verified',
          payoutCaps: [
            { variant: 'daily', cycle_from: 1, cycle_to: null, max_amount: 600, note: 'Daily — payouts quotidiens, DLL 500' },
            { variant: 'flex', cycle_from: 1, cycle_to: null, max_amount: 1_250, min_profit_days: 5, note: 'Flex — 5 jours, sans DLL' },
          ],
        },
        {
          account_size: 50_000, price: 165, drawdown_amount: 2_000, profit_target: 3_000,
          max_minis: 4, max_micros: 40, funded_max_minis: 4, funded_max_micros: 40, confidence: 'verified',
          payoutCaps: [
            { variant: 'daily', cycle_from: 1, cycle_to: null, max_amount: 1_000, note: 'Daily — DLL 1 000' },
            { variant: 'flex', cycle_from: 1, cycle_to: null, max_amount: 3_000, min_profit_days: 5, note: 'Flex — sans DLL' },
          ],
        },
        {
          account_size: 100_000, price: 265, drawdown_amount: 3_000, profit_target: 6_000,
          max_minis: 8, max_micros: 80, funded_max_minis: 8, funded_max_micros: 80, confidence: 'verified',
          payoutCaps: [
            { variant: 'daily', cycle_from: 1, cycle_to: null, max_amount: 1_500, note: 'Daily — DLL 1 250, drawdown financé 2 500' },
            { variant: 'flex', cycle_from: 1, cycle_to: null, max_amount: 4_000, min_profit_days: 5, note: 'Flex — sans DLL, drawdown financé 3 000' },
          ],
        },
        {
          account_size: 150_000, price: 369, drawdown_amount: 4_500, profit_target: 9_000,
          max_minis: 12, max_micros: 120, funded_max_minis: 12, funded_max_micros: 120, confidence: 'verified',
          payoutCaps: [
            { variant: 'daily', cycle_from: 1, cycle_to: null, max_amount: 2_500, note: 'Daily — DLL 1 750, drawdown financé 3 500' },
            { variant: 'flex', cycle_from: 1, cycle_to: null, max_amount: 5_000, min_profit_days: 5, note: 'Flex — sans DLL, drawdown financé 4 500' },
          ],
        },
      ],
    },
    {
      slug: 'lightning',
      name: 'Tradeify Lightning',
      account_kind: 'direct',
      description: 'Financement direct. Cohérence PROGRESSIVE : 20 % au 1er payout, 25 % au 2e, 30 % à partir du 3e.',
      offerDefaults: {
        ...BASE,
        profit_target: null,
        consistency_pct: 20,
        funded_consistency_pct: 20,
        payout_model: 'progressive',
        payout_min_days: 5,
      },
      offers: [
        { account_size: 25_000, price: 345, drawdown_amount: 1_000, daily_loss_limit: null, funded_daily_loss: null, max_minis: 1, max_micros: 10, funded_max_minis: 1, funded_max_micros: 10, confidence: 'verified' },
        { account_size: 50_000, price: 492, drawdown_amount: 2_000, daily_loss_limit: 1_250, funded_daily_loss: 1_250, max_minis: 4, max_micros: 40, funded_max_minis: 4, funded_max_micros: 40, confidence: 'verified' },
        { account_size: 100_000, price: 660, drawdown_amount: 4_000, daily_loss_limit: 2_500, funded_daily_loss: 2_500, max_minis: 8, max_micros: 80, funded_max_minis: 8, funded_max_micros: 80, confidence: 'verified' },
        {
          // CORRECTION 2026-07-24 : 5 250 et non 6 000 (valeur du concurrent).
          account_size: 150_000, price: 796, drawdown_amount: 5_250, daily_loss_limit: 3_000, funded_daily_loss: 3_000,
          max_minis: 12, max_micros: 120, funded_max_minis: 12, funded_max_micros: 120, confidence: 'verified',
        },
      ],
      /** Cohérence progressive par numéro de payout — confirmée par l'infobulle officielle. */
      payoutCaps: [
        { cycle_from: 1, cycle_to: 1, consistency_pct: 20, note: '1er payout' },
        { cycle_from: 2, cycle_to: 2, consistency_pct: 25, note: '2e payout' },
        { cycle_from: 3, cycle_to: null, consistency_pct: 30, note: '3e payout et suivants' },
      ],
    },
  ],

  engineCaveats: [
    'Select se divise en deux chemins PERMANENTS (Daily / Flex) : saisis en `variant` avec leurs plafonds par taille, mais le moteur ne fige pas encore la variante choisie au snapshot du compte (§12 #5).',
    'Les deux chemins de Select ont aussi des DRAWDOWNS FINANCÉS différents (ex. 100k : 2 500 en Daily contre 3 000 en Flex) : le schéma ne porte qu’un `funded_drawdown_*` par offre, la valeur Flex est retenue et l’écart noté en `note` de plafond.',
    'Lightning a une cohérence PROGRESSIVE par numéro de payout : saisie dans les plafonds, mais `evaluatePayout` lit la cohérence funded scalaire (§12 #4).',
    'Growth : le DLL remonte au niveau du drawdown une fois 6 % de profit atteint. Règle conditionnelle non modélisée — le moteur applique le DLL de départ en permanence, donc plus strictement que la réalité.',
    'Frais de reset relevés (60 à 215 $ selon plan et taille, jusqu’à 10 resets par mois) : aucune colonne `reset_fee` au schéma (§12 #9).',
    'Split possiblement à 100 % sur les 15 000 premiers dollars cumulés chez Growth — non confirmé sur la page publique, non saisi.',
  ],
  riskFlags: [
    '[PROMO] Remise permanente affichée : « 40% OFF » et « Save $X with code JULY » sur toutes les cartes (relevé 2026-07-24). AUCUNE date de fin. Prix catalogue = tarif de base.',
    'Un « Advanced Challenge » figure au contrat officiel mais n’apparaît pas dans le sélecteur public — non collecté.',
  ],
};
