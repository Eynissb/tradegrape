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
  // CORRECTION du 2026-07-24 : la page officielle affiche « per month ».
  // Le fichier initial indiquait un paiement unique — faux, et ça change
  // complètement la comparaison de coût face à Lucid ou Tradeify (unique).
  is_recurring: true,
  activation_fee: 0, // « No activation fee » confirmé sur chaque carte
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

/**
 * Tailles communes. Les limites de minis et les prix viennent de la page
 * officielle (2026-07-24) ; le tarif affiché est le prix PROMOTIONNEL
 * (« Now 50% OFF! »), le prix barré est conservé dans `price_regular`.
 */
const SIZES = [
  { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, max_minis: 5, price: 62, price_regular: 125 },
  { account_size: 100_000, drawdown_amount: 3_000, profit_target: 6_000, max_minis: 10, price: 115, price_regular: 230 },
  { account_size: 150_000, drawdown_amount: 4_500, profit_target: 9_000, max_minis: 15, price: 175, price_regular: 350 },
];

/**
 * `priced` : les tarifs relevés valent pour la formule QuickPay INTRADAY, seule
 * variante dont les cartes sont rendues côté serveur. Les autres plans gardent
 * `price: null` — on ne suppose pas que l'EOD coûte le même prix.
 */
const offers = (priced: boolean): OfferInput[] =>
  SIZES.map(({ price, price_regular, ...s }) => ({
    ...s,
    price: priced ? price : null,
    price_regular: priced ? price_regular : null,
    confidence: priced ? ('verified' as const) : ('unverified' as const),
  }));

function plan(slug: string, name: string, extra: Partial<OfferInput>, description: string, priced = false): PlanSeed {
  return {
    slug, name, account_kind: 'evaluation', description,
    offerDefaults: { ...BASE, ...extra },
    offers: offers(priced),
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
        // Vérifié à la source : drawdown, objectif, cohérence, jours min,
        // limites de contrats et absence de frais d'activation.
        confidence: 'verified',
        unverifiedFields: [],
        note: 'Règles et tarifs vérifiés sur tradeday.com le 2026-07-24. Prix affiché = promotion « 50% OFF » ; permanence non établie.',
      },
      'Trailing intraday en évaluation comme en financé. Payout dès 1 jour.',
      true),

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
    'Frais de reset relevés à la source (60 / 110 / 165 $ selon la taille) : aucune colonne `reset_fee` au schéma (§12 #9), donc non saisis.',
    'Split par palier sur QuickPay : 50/50 sous 4 000 $ de profit puis 80/20 (§12 #3). `profit_split` scalaire laissé vide plutôt que d’afficher une seule des deux valeurs ; le palier est saisissable dans les plafonds mais non consommé par le moteur.',
    'FastPass : 80/20, jusqu’à 90 % en compte live — la progression n’est pas modélisée.',
    'FastPass démarre à 2-4 contrats en financé, +1 contrat par 2 000 $ de profit de clôture : relève du scaling, non collecté précisément.',
  ],
  riskFlags: [
    'Le code promo « ANT » (-30 % → -50 %) est négocié en affiliation par le comparateur CONCURRENT : à NE PAS saisir. Cible de négociation pour un code exclusif Tradegrape.',
  ],
};
