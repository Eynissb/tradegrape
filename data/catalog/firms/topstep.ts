import type { FirmSeed } from '@/lib/seed/types';

/**
 * Topstep — collecte du 2026-07-21 (source officielle « mise à jour cette semaine »).
 * Facturation MENSUELLE, sans limite de temps ni expiration : structurellement
 * différent d'Apex (30 jours, sans reset).
 */
export const topstep: FirmSeed = {
  slug: 'topstep',
  name: 'Topstep',
  collectedAt: '2026-07-21',
  collects_eu_vat: true,

  platforms: [
    { slug: 'topstepx', is_free: true },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'tradovate', is_free: true },
  ],

  plans: [
    {
      slug: 'combine',
      name: 'Topstep Combine',
      account_kind: 'evaluation',
      description: 'Abonnement mensuel, activation incluse, sans limite de temps.',
      offerDefaults: {
        activation_fee: 0,
        currency: 'USD',
        drawdown_type: 'EOD',
        // Le Help Center est explicite sur le verrouillage au capital initial.
        drawdown_locks_at_breakeven: true,
        consistency_pct: 50,
        min_trading_days: 2,
        funded_drawdown_type: 'EOD',
        // Aucune cohérence en financé sur le chemin Standard (100 = désactivée).
        funded_consistency_pct: 100,
        profit_split: 90,
        payout_model: 'fixed_cap',
        payout_min_amount: 125,
        payout_min_days: 5,
        payout_daily_threshold: 150,
        payout_method: 'Aeropay / Wise / ACH / Wire',
        platforms: ['topstepx', 'ninjatrader', 'tradovate'],
        confidence: 'verified',
        // Prix mensuels contradictoires entre sources (149 vs 199 sur le 150k).
        unverifiedFields: ['price'],
      },
      offers: [
        {
          account_size: 50_000, price: 49, drawdown_amount: 2_000, profit_target: 3_000,
          daily_loss_limit: 1_000, funded_daily_loss: 1_000,
          max_minis: 5, max_micros: 50, funded_max_minis: 5, funded_max_micros: 50,
          confidence: 'verified',
        },
        {
          account_size: 100_000, price: 99, drawdown_amount: 3_000, profit_target: 6_000,
          daily_loss_limit: 2_000, funded_daily_loss: 2_000,
          max_minis: 10, max_micros: 100, funded_max_minis: 10, funded_max_micros: 100,
          confidence: 'verified',
        },
        {
          // MLL 4 500 (et non 4 000) : point explicitement souligné à la collecte.
          account_size: 150_000, price: 149, drawdown_amount: 4_500, profit_target: 9_000,
          daily_loss_limit: 3_000, funded_daily_loss: 3_000,
          max_minis: 15, max_micros: 150, funded_max_minis: 15, funded_max_micros: 150,
          confidence: 'verified',
          note: 'Prix 150k contradictoire : 149 selon une source, 199 selon une autre.',
        },
      ],

      /**
       * DEUX CHEMINS DE PAYOUT pour la même offre (§12 #5). Impossible par
       * duplication d'offre : `offers` porte unique(plan_id, account_size).
       *
       * ⚠️ Les MONTANTS sont certains (2000/3000/5000 et 3000/4000/6000), mais la
       * collecte ne précise pas les BORNES de cycle. Le découpage 1-2 / 3-4 / 5+
       * ci-dessous suit la progression usuelle de Topstep et reste à confirmer.
       */
      payoutCaps: [
        { variant: 'standard', cycle_from: 1, cycle_to: 2, max_amount: 2_000, min_profit_days: 5, daily_threshold: 150, note: 'Standard — bornes de cycle à vérifier' },
        { variant: 'standard', cycle_from: 3, cycle_to: 4, max_amount: 3_000, min_profit_days: 5, daily_threshold: 150, note: 'Standard — bornes de cycle à vérifier' },
        { variant: 'standard', cycle_from: 5, cycle_to: null, max_amount: 5_000, min_profit_days: 5, daily_threshold: 150, note: 'Standard — bornes de cycle à vérifier' },
        { variant: 'consistency', cycle_from: 1, cycle_to: 2, max_amount: 3_000, min_profit_days: 3, consistency_pct: 40, note: 'Consistency — bornes de cycle à vérifier' },
        { variant: 'consistency', cycle_from: 3, cycle_to: 4, max_amount: 4_000, min_profit_days: 3, consistency_pct: 40, note: 'Consistency — bornes de cycle à vérifier' },
        { variant: 'consistency', cycle_from: 5, cycle_to: null, max_amount: 6_000, min_profit_days: 3, consistency_pct: 40, note: 'Consistency — bornes de cycle à vérifier' },
      ],
    },
  ],

  engineCaveats: [
    'MLL surveillé EN TEMPS RÉEL avec le P&L latent, bien qu’il ne se recalcule qu’à la clôture : une position ouverte qui touche le MLL liquide le compte. Notre EOD ne modélise que les clôtures — nous serons plus permissifs que la réalité intraday.',
    'Après le PREMIER PAYOUT, le MLL se verrouille définitivement à zéro (le solde devient le plancher). Non modélisé : le moteur ne connaît pas l’historique des payouts.',
    'DLL optionnel payant : remise de 10/20/30 $ et plafond de payout DOUBLÉ (depuis le 2026-06-02, durée limitée). §12 #8, parké — contournement : créer un plan distinct si on veut le lister.',
    'Le DLL reste appliqué sur NinjaTrader alors qu’il a été retiré sur TopstepX : comportement dépendant de la plateforme (§12 #2), non modélisable par offre.',
    '« Topstep Labs » propose un Combine à drawdown STATIQUE — troisième variante récente, non collectée.',
  ],
};
