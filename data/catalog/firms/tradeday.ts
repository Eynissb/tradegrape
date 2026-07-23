import type { FirmSeed, OfferInput, PlanSeed } from '@/lib/seed/types';

/**
 * TradeDay — collecte du 2026-07-21, après la refonte « TradeDay 2.0 » (juin 2026).
 * L'ancienne gamme Intraday / EOD / Static a disparu.
 *
 * ⚠️ LE PIÈGE : sur QuickPay, le drawdown financé est TOUJOURS en trailing
 * intraday, même si l'évaluation a été passée en EOD. Un trader qui choisit
 * « QuickPay EOD » en croyant garder l'EOD se retrouve en intraday une fois
 * financé. Seul FastPass conserve l'EOD. C'est ce que `rulesForPhase` applique.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: false,
  activation_fee: 0,
  drawdown_locks_at_breakeven: true,
  daily_loss_limit: null, // AUCUN DLL, dans aucune phase : le drawdown est la seule règle d'échec
  funded_daily_loss: null,
  funded_consistency_pct: 100, // cohérence supprimée en compte financé
  max_micros: 50, // limite micro identique sur toutes les tailles
  funded_max_micros: 50,
  payout_min_amount: 250,
  platforms: ['tradovate', 'ninjatrader'],
  price: null,
  confidence: 'unverified',
  unverifiedFields: ['drawdown_amount', 'price', 'max_minis'],
  note: 'Drawdowns repris du comparateur concurrent ; limites de minis non trouvées.',
};

const SIZES = [
  { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000 },
  { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000 },
  { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000 },
];

const offers = (): OfferInput[] =>
  SIZES.map((s) => ({ ...s, confidence: 'unverified' as const }));

function plan(slug: string, name: string, extra: Partial<OfferInput>, description: string): PlanSeed {
  return {
    slug, name, account_kind: 'evaluation', description,
    offerDefaults: { ...BASE, ...extra },
    offers: offers(),
  };
}

export const tradeday: FirmSeed = {
  slug: 'tradeday',
  name: 'TradeDay',
  collectedAt: '2026-07-21',
  inactivity_days: 30, // fermeture sans notification

  platforms: [
    { slug: 'tradovate', is_free: true },
    { slug: 'ninjatrader', is_free: true },
  ],

  plans: [
    plan('quickpay-intraday', 'TradeDay QuickPay Intraday',
      {
        drawdown_type: 'TRAIL', funded_drawdown_type: 'TRAIL',
        consistency_pct: 30, min_trading_days: 5,
        payout_model: 'progressive', payout_min_days: 1,
      },
      'Trailing intraday en évaluation comme en financé. Payout dès 1 jour.'),

    plan('quickpay-eod', 'TradeDay QuickPay EOD',
      {
        drawdown_type: 'EOD',
        funded_drawdown_type: 'TRAIL', // ← le piège
        consistency_pct: 30, min_trading_days: 5,
        payout_model: 'progressive', payout_min_days: 1,
      },
      '⚠️ EOD en évaluation, mais TRAILING INTRADAY une fois financé — le durcissement est automatique.'),

    plan('fastpass-eod', 'TradeDay FastPass EOD',
      {
        drawdown_type: 'EOD', funded_drawdown_type: 'EOD', // seul plan qui conserve l'EOD
        consistency_pct: 45, min_trading_days: 3,
        payout_model: 'fixed_cap', payout_min_days: 5,
      },
      'Seul plan qui conserve l’EOD en compte financé. 5 jours profitables avant payout.'),
  ],

  engineCaveats: [
    'Split par palier sur QuickPay : 50/50 sous 4 000 $ de profit puis 80/20 (§12 #3). `profit_split` scalaire laissé vide plutôt que d’afficher une seule des deux valeurs ; le palier est saisissable dans les plafonds mais non consommé par le moteur.',
    'FastPass : 80/20, jusqu’à 90 % en compte live — la progression n’est pas modélisée.',
    'FastPass démarre à 2-4 contrats en financé, +1 contrat par 2 000 $ de profit de clôture : relève du scaling, non collecté précisément.',
  ],
  riskFlags: [
    'Le code promo « ANT » (-30 % → -50 %) est négocié en affiliation par le comparateur CONCURRENT : à NE PAS saisir. Cible de négociation pour un code exclusif Tradegrape.',
  ],
};
