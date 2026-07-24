import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * Apex Trader Funding — collecte du 2026-07-21.
 * Quatre plans = deux types de drawdown (Intraday / EOD) × deux formules
 * d'activation (payante / gratuite). Expiration 30 jours, AUCUN reset.
 */

const COMMON: Partial<OfferInput> = {
  currency: 'USD',
  consistency_pct: 100, // aucune cohérence en évaluation
  min_trading_days: 1,
  funded_consistency_pct: 50, // 50 % en compte financé uniquement
  profit_split: 100,
  payout_model: 'progressive',
  payout_min_amount: 500,
  payout_min_days: 5,
  payout_method: 'Plane / ACH',
  platforms: ['rithmic', 'tradovate', 'ninjatrader', 'wealthcharts'],
  /**
   * ⚠️ Apex ne verrouille PAS le trailing sur Tradovate, alors qu'il verrouille
   * sur Rithmic et WealthCharts (§12 #2). Une seule valeur par offre : on retient
   * le comportement DOMINANT (verrouillé), qui est aussi le plus permissif à
   * l'affichage. Sur Tradovate le plancher réel est donc plus HAUT que le nôtre.
   */
  drawdown_locks_at_breakeven: true,
};

/**
 * Tailles communes aux quatre plans. Règles vérifiées sur apextraderfunding.com
 * le 2026-07-24 : objectifs, drawdowns et limites de contrats confirmés pour
 * TOUTES les tailles (ils n'étaient déduits que du 25k jusqu'ici).
 *
 * `price` = tarif de BASE, sans le coupon. Apex affiche en permanence un prix
 * barré et un prix « with Coupon Code » (-90 %) : le tarif remisé dépend d'un
 * code, il vit donc dans `promo_codes`, pas dans le prix catalogue.
 */
const SIZES = [
  { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500, max_minis: 4, max_micros: 40, funded_max_minis: 2, funded_max_micros: 20, payout_buffer: 26_100, eodDll: 500, thrEod: 100, thrIntra: 100,
    price: { intradayStd: 199, intradayNoAct: 690, eodStd: 390, eodNoAct: 990 } },
  { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, max_minis: 6, max_micros: 60, funded_max_minis: 4, funded_max_micros: 40, payout_buffer: 52_100, eodDll: 1_000, thrEod: 250, thrIntra: 200,
    price: { intradayStd: 249, intradayNoAct: 790, eodStd: 490, eodNoAct: 1_190 } },
  { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 8, max_micros: 80, funded_max_minis: 6, funded_max_micros: 60, payout_buffer: 103_100, eodDll: 1_500, thrEod: 300, thrIntra: 250,
    // 590 $ : MOINS cher que le 50k (790 $) sur la même formule. Anomalie relue
    // deux fois sur la page — conservée telle quelle, mais signalée.
    price: { intradayStd: 399, intradayNoAct: 590, eodStd: 790, eodNoAct: 1_590 } },
  { account_size: 150_000, drawdown_amount: 4_000, profit_target: 9_000, max_minis: 12, max_micros: 120, funded_max_minis: 10, funded_max_micros: 100, payout_buffer: 154_100, eodDll: 2_000, thrEod: 350, thrIntra: 300,
    price: { intradayStd: 599, intradayNoAct: 1_690, eodStd: 1_490, eodNoAct: 2_490 } },
];

type PriceKey = keyof (typeof SIZES)[number]['price'];

function buildOffers(kind: 'intraday' | 'eod', activationFee: number, priceKey: PriceKey): OfferInput[] {
  return SIZES.map((s) => ({
    account_size: s.account_size,
    price: s.price[priceKey],
    activation_fee: activationFee,
    drawdown_type: kind === 'intraday' ? 'TRAIL' : 'EOD',
    drawdown_amount: s.drawdown_amount,
    profit_target: s.profit_target,
    daily_loss_limit: kind === 'eod' ? s.eodDll : null,
    funded_drawdown_type: kind === 'intraday' ? 'TRAIL' : 'EOD',
    funded_daily_loss: kind === 'eod' ? s.eodDll : null,
    max_minis: s.max_minis,
    max_micros: s.max_micros,
    funded_max_minis: s.funded_max_minis,
    funded_max_micros: s.funded_max_micros,
    payout_buffer: s.payout_buffer,
    payout_daily_threshold: kind === 'eod' ? s.thrEod : s.thrIntra,
    /* Objectifs, drawdowns, limites de contrats, jours min et prix : vérifiés à
       la source pour TOUTES les tailles. Reste le seuil journalier de payout,
       absent de la page publique et issu d'une source unique — c'est une règle
       consommée par `evaluatePayout`, elle bloque donc la vérification. */
    confidence: 'verified',
    unverifiedFields: ['payout_daily_threshold'],
    note: 'Règles et prix vérifiés sur apextraderfunding.com le 2026-07-24. Seuil journalier de payout non publié : source unique.',
  }));
}

export const apex: FirmSeed = {
  slug: 'apex-trader-funding',
  name: 'Apex Trader Funding',
  collectedAt: '2026-07-21',
  max_funded_accounts: 20,

  platforms: [
    { slug: 'rithmic', is_free: true },
    { slug: 'tradovate', is_free: true, note: 'Le trailing NE se verrouille PAS sur cette plateforme.' },
    { slug: 'ninjatrader', is_free: true },
    { slug: 'wealthcharts', is_free: true },
  ],

  plans: [
    {
      // CORRECTION 2026-07-24 : activation à 79 $, pas 59 $ (valeur du concurrent).
      slug: 'intraday-standard', name: 'Apex Intraday (activation 79 $)', account_kind: 'evaluation',
      offerDefaults: COMMON, offers: buildOffers('intraday', 79, 'intradayStd'),
    },
    {
      slug: 'intraday-no-activation', name: 'Apex Intraday (sans activation)', account_kind: 'evaluation',
      description: 'Mêmes règles, activation gratuite, évaluation plus chère.',
      offerDefaults: COMMON, offers: buildOffers('intraday', 0, 'intradayNoAct'),
    },
    {
      // CORRECTION 2026-07-24 : activation à 129 $, pas 99 $.
      slug: 'eod-standard', name: 'Apex EOD (activation 129 $)', account_kind: 'evaluation',
      offerDefaults: COMMON, offers: buildOffers('eod', 129, 'eodStd'),
    },
    {
      slug: 'eod-no-activation', name: 'Apex EOD (sans activation)', account_kind: 'evaluation',
      description: 'Mêmes règles, activation gratuite.',
      offerDefaults: COMMON, offers: buildOffers('eod', 0, 'eodNoAct'),
    },
  ],

  engineCaveats: [
    'Le trailing ne se verrouille PAS sur Tradovate (il se verrouille sur Rithmic et WealthCharts). Une seule valeur `drawdown_locks_at_breakeven` par offre : le cas Tradovate est sous-estimé (§12 #2).',
    'Expiration à 30 jours calendaires sans reset possible : ni `eval_duration_days` ni `reset_fee` n’existent au schéma (§12 #9).',
    'Maximum 6 retraits, non modélisé.',
  ],
  riskFlags: [
    'Métaux SUSPENDUS depuis le 2026-03-14 (GC, SI, QI, QO, MGC, HG, PL, PA), sans date de retour annoncée.',
    'PROMO PERMANENTE ? Le site affiche « ANY SIZE EVALS UP TO 90% OFF », code SAVENOW, avec un compte à rebours « Ends in: 5j » (relevé 2026-07-24, soit une fin annoncée vers le 2026-07-29). Le prix catalogue retenu est le tarif de BASE, sans coupon : un remisé à -90 % en permanence n’est pas un prix normal. À revoir après la date annoncée pour savoir si le compte à rebours se réinitialise.',
    'ANOMALIE DE PRIX : le 100k « No Activation Fee » Intraday est à 590 $, MOINS cher que le 50k (790 $). Relu deux fois sur la page. Peut être une erreur du site — à confirmer avant publication.',
    'Le financé affiche « Daily Loss Limit : YES » sur les formules INTRADAY aussi, alors que la collecte le réservait à l’EOD. Montant non publié — non saisi.',
  ],
};
