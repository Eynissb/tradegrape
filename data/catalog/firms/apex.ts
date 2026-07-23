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

/** Tailles communes aux quatre plans. Seuls activation et DLL/type varient. */
const SIZES = [
  { account_size: 25_000, drawdown_amount: 1_000, profit_target: 1_500, max_minis: 4, max_micros: 40, funded_max_minis: 2, funded_max_micros: 20, payout_buffer: 26_100, eodDll: 500, thrEod: 100, thrIntra: 100 },
  { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, max_minis: 6, max_micros: 60, funded_max_minis: 4, funded_max_micros: 40, payout_buffer: 52_100, eodDll: 1_000, thrEod: 250, thrIntra: 200 },
  { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 8, max_micros: 80, funded_max_minis: 6, funded_max_micros: 60, payout_buffer: 103_100, eodDll: 1_500, thrEod: 300, thrIntra: 250 },
  { account_size: 150_000, drawdown_amount: 4_000, profit_target: 9_000, max_minis: 12, max_micros: 120, funded_max_minis: 10, funded_max_micros: 100, payout_buffer: 154_100, eodDll: 2_000, thrEod: 350, thrIntra: 300 },
];

function buildOffers(kind: 'intraday' | 'eod', activationFee: number): OfferInput[] {
  return SIZES.map((s) => ({
    account_size: s.account_size,
    price: null, // non collecté
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
    // Seul le 25k est confirmé par capture directe ; les tailles supérieures
    // sont déduites (concordantes entre plusieurs sources, mais déduites).
    confidence: s.account_size === 25_000 ? 'verified' : 'unverified',
    unverifiedFields: ['payout_daily_threshold', 'price'],
    note:
      s.account_size === 25_000
        ? 'Seuils journaliers de payout issus d’une source unique.'
        : 'Taille déduite du 25k confirmé ; seuils journaliers d’une source unique.',
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
      slug: 'intraday-standard', name: 'Apex Intraday (activation 59 $)', account_kind: 'evaluation',
      offerDefaults: COMMON, offers: buildOffers('intraday', 59),
    },
    {
      slug: 'intraday-no-activation', name: 'Apex Intraday (sans activation)', account_kind: 'evaluation',
      description: 'Mêmes règles, activation gratuite, évaluation plus chère.',
      offerDefaults: COMMON, offers: buildOffers('intraday', 0),
    },
    {
      slug: 'eod-standard', name: 'Apex EOD (activation 99 $)', account_kind: 'evaluation',
      offerDefaults: COMMON, offers: buildOffers('eod', 99),
    },
    {
      slug: 'eod-no-activation', name: 'Apex EOD (sans activation)', account_kind: 'evaluation',
      description: 'Mêmes règles, activation gratuite.',
      offerDefaults: COMMON, offers: buildOffers('eod', 0),
    },
  ],

  engineCaveats: [
    'Le trailing ne se verrouille PAS sur Tradovate (il se verrouille sur Rithmic et WealthCharts). Une seule valeur `drawdown_locks_at_breakeven` par offre : le cas Tradovate est sous-estimé (§12 #2).',
    'Expiration à 30 jours calendaires sans reset possible : ni `eval_duration_days` ni `reset_fee` n’existent au schéma (§12 #9).',
    'Maximum 6 retraits, non modélisé.',
  ],
  riskFlags: [
    'Métaux SUSPENDUS depuis le 2026-03-14 (GC, SI, QI, QO, MGC, HG, PL, PA), sans date de retour annoncée.',
  ],
};
