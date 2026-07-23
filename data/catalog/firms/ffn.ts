import type { FirmSeed, OfferInput } from '@/lib/seed/types';

/**
 * FFN (Funded Futures Network) — collecte du 2026-07-21.
 *
 * ⚠️ FIRM LA MOINS FIABLE DE LA COLLECTE. La correspondance entre les plans du
 * comparateur concurrent (« Standard MAX », « Steady ») et ceux trouvés en
 * source (OG Standard, OG Express, MAX Standard, MAX Express) n'est PAS établie.
 * « Steady » et sa cohérence à 52 % n'apparaissent dans aucune source.
 * Tout est donc marqué à revérifier, et un seul plan est saisi plutôt que
 * d'inventer une correspondance à quatre entrées.
 */

const BASE: Partial<OfferInput> = {
  currency: 'USD',
  is_recurring: true, // abonnement mensuel
  activation_fee: 120, // après passage
  drawdown_type: 'EOD',
  funded_drawdown_type: 'EOD',
  drawdown_locks_at_breakeven: true,
  consistency_pct: 40,
  funded_consistency_pct: 25,
  daily_loss_limit: null, // aucun DLL sur les comptes Standard
  funded_daily_loss: null,
  min_trading_days: 5,
  profit_split: 90,
  payout_model: 'buffer_then_free',
  payout_min_amount: 500,
  payout_min_days: 5, // cinq jours gagnants avant CHAQUE retrait, compteur remis à zéro
  platforms: ['rithmic'],
  price: null,
  confidence: 'unverified',
  unverifiedFields: ['drawdown_amount', 'consistency_pct', 'price'],
  note: 'Drawdowns du concurrent ; correspondance de plan non établie.',
};

export const ffn: FirmSeed = {
  slug: 'funded-futures-network',
  name: 'Funded Futures Network',
  collectedAt: '2026-07-21',

  platforms: [{ slug: 'rithmic', is_free: true }],

  plans: [
    {
      slug: 'max-standard',
      name: 'FFN MAX Standard',
      account_kind: 'evaluation',
      description: 'Voie MAX : pas de phase d’exhibition. Cinq jours gagnants avant chaque retrait, solde ≥ buffer + 500 $.',
      offerDefaults: BASE,
      offers: [
        { account_size: 25_000, drawdown_amount: 1_500, profit_target: 2_000, confidence: 'unverified' },
        { account_size: 50_000, drawdown_amount: 2_000, profit_target: 3_000, confidence: 'unverified' },
        { account_size: 100_000, drawdown_amount: 3_600, profit_target: 6_000, confidence: 'unverified' },
        { account_size: 150_000, drawdown_amount: 5_000, profit_target: 9_000, confidence: 'unverified' },
        { account_size: 250_000, drawdown_amount: 6_000, profit_target: 15_000, confidence: 'unverified' },
      ],
    },
  ],

  engineCaveats: [
    'Les comptes OG exigent une PHASE D’EXHIBITION entre évaluation et financé (7 jours en Standard, 4 en Express, buffer de 2 000 $ à construire). §12 #7, parké : `rulesForPhase` ne connaît que evaluation/funded. La voie OG n’est donc pas saisie.',
    'Buffer MAX = drawdown d’évaluation : dépend de la taille, non renseigné faute de valeurs absolues fiables.',
    'Reset à 100 $ : `reset_fee` n’existe pas au schéma (§12 #9).',
  ],
  riskFlags: [
    'Correspondance de plans non établie entre sources et comparateur concurrent : « Steady » (cohérence 52 %) est introuvable. Seule la voie MAX Standard est saisie — OG Standard, OG Express et MAX Express manquent.',
  ],
};
