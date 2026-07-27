import type { PublicOfferRow } from './public-offer';

/**
 * Ligne d'offre de référence pour les tests du comparateur.
 *
 * Partagée entre les fichiers de test plutôt que recopiée : ajouter un champ
 * obligatoire à `PublicOfferRow` doit casser à UN endroit, pas à trois — et
 * surtout, doit forcer à décider de sa valeur par défaut une seule fois.
 *
 * Valeurs calquées sur Take Profit Trader 50k, la première offre publiée.
 */
/**
 * `firm` se fusionne en profondeur : les tests n'en surchargent souvent qu'une
 * partie (`{ slug, name, health_score }`) et héritent des autres champs par
 * défaut (logo, pays, année…), sans avoir à tous les répéter.
 */
type RowOverride = Partial<Omit<PublicOfferRow, 'firm'>> & { firm?: Partial<PublicOfferRow['firm']> };

export function row(over: RowOverride = {}): PublicOfferRow {
  const { firm: firmOver, ...rest } = over;
  const base: PublicOfferRow = {
    id: 'o1',
    account_size: 50_000,
    currency: 'USD',
    price: 170,
    price_regular: null,
    activation_fee: 130,
    is_recurring: true,
    drawdown_type: 'EOD',
    drawdown_amount: 2_000,
    drawdown_locks_at_breakeven: true,
    profit_target: 3_000,
    daily_loss_limit: null,
    consistency_pct: null,
    min_trading_days: 5,
    max_minis: null,
    max_micros: null,
    funded_max_minis: null,
    funded_max_micros: null,
    funded_drawdown_type: null,
    funded_drawdown_amount: null,
    funded_daily_loss: null,
    funded_consistency_pct: null,
    profit_split: 80,
    payout_model: null,
    payout_buffer: null,
    payout_min_amount: null,
    payout_frequency_days: null,
    payout_min_days: null,
    payout_method: null,
    reviewed_at: '2026-07-21',
    plan: { slug: 'test-pro', name: 'TPT Test → PRO', account_kind: 'evaluation', rating: null },
    firm: {
      slug: 'take-profit-trader',
      name: 'Take Profit Trader',
      health_score: 70,
      logo_url: null,
      country: 'US',
      founded_year: 2021,
      max_funded_accounts: null,
    },
    promo: null,
  };
  return { ...base, ...rest, firm: { ...base.firm, ...firmOver } };
}

/** Raccourci de ligne de plafond : la plupart des champs sont nuls la plupart du temps. */
export function cap(over: Partial<import('./public-offer').PayoutCapRow> = {}) {
  return {
    cycle_from: 1,
    cycle_to: null,
    max_amount: null,
    max_pct: null,
    variant: null,
    split_pct: null,
    consistency_pct: null,
    min_profit_days: null,
    ...over,
  };
}
