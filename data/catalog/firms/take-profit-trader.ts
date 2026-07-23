import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Take Profit Trader — collecte du 2026-07-21.
 *
 * ⚠️ MÉCANISME CENTRAL : le drawdown passe d'EOD (Test) à TRAILING INTRADAY
 * (compte financé PRO). Une source le qualifie de « plus grande différence de
 * règle entre les étapes et la raison la plus fréquente de perte du compte
 * financé la première semaine ». Le comparateur concurrent n'affiche que l'EOD.
 * C'est exactement ce que `rulesForPhase` applique désormais.
 *
 * ⚠️ COHÉRENCE LAISSÉE À `null` : chez TPT, dépasser la cohérence n'échoue pas
 * le Test — cela AUGMENTE l'objectif de profit (§12 #6). Notre moteur la
 * traiterait comme une infraction : afficher « règle cassée » là où la firm dit
 * « objectif relevé » serait un faux positif sur un outil de gestion du risque.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: true, // abonnement mensuel jusqu'au passage
  activation_fee: 130, // activation PRO
  drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true, // verrouillage au solde initial en Test
  funded_drawdown_type: 'TRAIL', // ← le durcissement
  consistency_pct: null, // cf. §12 #6 ci-dessus
  funded_consistency_pct: 100, // aucune cohérence en financé
  daily_loss_limit: null, // DLL supprimé en 2025
  funded_daily_loss: null,
  min_trading_days: 5,
  profit_split: 80, // 80/20 en PRO ; 90/10 seulement en PRO+ après promotion
  payout_model: 'buffer_then_free',
  payout_min_amount: 250,
  platforms: ['ninjatrader', 'tradovate', 'tradingview'],
  price: null,
  confidence: 'unverified',
  unverifiedFields: ['drawdown_amount', 'price'],
  note: 'Drawdowns repris du comparateur concurrent ; prix mensuel non trouvé.',
};

/** Buffer TPT = capital + drawdown. */
const b = (size: number, dd: number) => size + dd;

export const takeProfitTrader: FirmSeed = {
  slug: 'take-profit-trader',
  name: 'Take Profit Trader',
  collectedAt: '2026-07-21',
  daily_flat_time: '16:59 America/New_York',

  platforms: [
    { slug: 'ninjatrader', is_free: true },
    { slug: 'tradovate', is_free: true },
    { slug: 'tradingview', is_free: true },
  ],

  plans: [
    {
      slug: 'test-pro',
      name: 'TPT Test → PRO',
      account_kind: 'evaluation',
      description: 'Objectif à 6 % du capital. EOD pendant le Test, trailing intraday une fois financé.',
      offerDefaults: BASE,
      offers: [
        { account_size: 25_000, drawdown_amount: 1_500, profit_target: 1_500, payout_buffer: b(25_000, 1_500), max_minis: 3, max_micros: 30, funded_max_minis: 3, funded_max_micros: 30, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, payout_buffer: b(50_000, 2_000), max_minis: 6, max_micros: 60, funded_max_minis: 6, funded_max_micros: 60, confidence: 'unverified' },
        { account_size: 75_000, drawdown_amount: 2_500, profit_target: 4_500, payout_buffer: b(75_000, 2_500), max_minis: 9, max_micros: 90, funded_max_minis: 9, funded_max_micros: 90, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, payout_buffer: b(100_000, 3_000), max_minis: 12, max_micros: 120, funded_max_minis: 12, funded_max_micros: 120, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, payout_buffer: b(150_000, 4_500), max_minis: 15, max_micros: 150, funded_max_minis: 15, funded_max_micros: 150, confidence: 'unverified' },
      ],
    },
  ],

  engineCaveats: [
    'La cohérence de 50 % en Test AUGMENTE l’objectif de profit au lieu de faire échouer (§12 #6). `consistency_pct` laissé à `null` : mieux vaut une donnée absente qu’un faux positif sur un outil de risque.',
    'Frais de 50 $ sous 250 $ de retrait : non modélisé.',
  ],
};
