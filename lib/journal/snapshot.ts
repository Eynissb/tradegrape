import type { OfferRules, PayoutRules, RuleState, Trade } from '@/lib/rules/types';

/**
 * Snapshot des règles figé sur `journal_accounts.rules_snapshot` à l'ajout du compte.
 * L'offre peut évoluer ensuite : le compte garde ses règles + une alerte de changement.
 */
export interface RulesSnapshot {
  rules: OfferRules; // pour evaluateAccount
  payout: PayoutRules; // pour evaluatePayout
  display: {
    firmName: string;
    planName: string;
    firmSlug: string;
    planSlug: string;
    currency: string;
    profitSplit: number | null;
    payoutModel: string | null;
  };
}

/** Colonnes d'offre nécessaires pour construire un snapshot. */
export interface OfferRuleRow {
  account_size: number;
  currency: string | null;
  drawdown_type: OfferRules['drawdownType'];
  drawdown_amount: number;
  profit_target: number | null;
  daily_loss_limit: number | null;
  consistency_pct: number | null;
  min_trading_days: number | null;
  /* Règles durcies en financé — lues par `rulesForPhase`, pas seulement stockées. */
  funded_drawdown_type: OfferRules['drawdownType'] | null;
  funded_daily_loss: number | null;
  funded_consistency_pct: number | null;
  payout_buffer: number | null;
  payout_min_amount: number | null;
  payout_min_days: number | null;
  payout_daily_threshold: number | null;
  profit_split: number | null;
  payout_model: string | null;
}

const n = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Ligne de `offer_payout_caps` — plafonds de retrait pour une plage de cycles. */
export interface PayoutCapRow {
  cycle_from: number | null;
  cycle_to: number | null;
  max_amount: number | null;
  max_pct: number | null;
  min_profit: number | null;
}

/**
 * Plafond applicable au 1er cycle de payout (ce que rencontre un compte financé
 * neuf). `evaluatePayout` ne modélise qu'un cycle : on fige donc les valeurs du
 * cycle qui couvre le payout n°1. La progression par cycle (cap qui change au 3e,
 * 5e payout) reste un enrichissement §12 — les autres caps sont saisis et servent
 * l'affichage comparateur « plafonds par cycle », pas encore le moteur.
 */
export function pickFirstCycleCap(caps: PayoutCapRow[]): PayoutCapRow | null {
  if (caps.length === 0) return null;
  const covering = caps.filter(
    (c) => (c.cycle_from ?? 1) <= 1 && (c.cycle_to == null || c.cycle_to >= 1),
  );
  const pool = covering.length > 0 ? covering : caps;
  return pool.reduce((best, c) =>
    (c.cycle_from ?? 1) < (best.cycle_from ?? 1) ? c : best,
  );
}

export function buildRulesSnapshot(
  offer: OfferRuleRow,
  marketType: OfferRules['marketType'],
  firm: { name: string; slug: string },
  plan: { name: string; slug: string },
  caps: PayoutCapRow[] = [],
): RulesSnapshot {
  const cap = pickFirstCycleCap(caps);
  return {
    rules: {
      marketType,
      accountSize: Number(offer.account_size),
      drawdownType: offer.drawdown_type,
      drawdownAmount: Number(offer.drawdown_amount),
      profitTarget: n(offer.profit_target),
      dailyLossLimit: n(offer.daily_loss_limit),
      consistencyPct: n(offer.consistency_pct),
      minTradingDays: Number(offer.min_trading_days ?? 1),
      // Figées au snapshot : le compte gardera ces variantes même si l'offre change.
      fundedDrawdownType: offer.funded_drawdown_type ?? null,
      fundedDailyLossLimit: n(offer.funded_daily_loss),
    },
    payout: {
      buffer: n(offer.payout_buffer),
      minAmount: n(offer.payout_min_amount),
      minProfitDays: n(offer.payout_min_days),
      dailyThreshold: n(offer.payout_daily_threshold),
      consistencyPct: n(offer.funded_consistency_pct),
      // Plafonds du 1er cycle, lus depuis offer_payout_caps (cf. pickFirstCycleCap).
      minCycleProfit: cap ? n(cap.min_profit) : null,
      maxAmount: cap ? n(cap.max_amount) : null,
      maxPct: cap ? n(cap.max_pct) : null,
    },
    display: {
      firmName: firm.name,
      planName: plan.name,
      firmSlug: firm.slug,
      planSlug: plan.slug,
      currency: offer.currency ?? 'USD',
      profitSplit: n(offer.profit_split),
      payoutModel: offer.payout_model,
    },
  };
}

/** Saisie manuelle des règles (firm non listée). */
export interface ManualRulesInput {
  firmName: string;
  accountSize: number;
  drawdownType: OfferRules['drawdownType'];
  drawdownAmount: number;
  profitTarget: number | null;
  dailyLossLimit: number | null;
  consistencyPct: number | null;
  minTradingDays: number;
  currency: string;
  payout: PayoutRules;
}

export function buildManualSnapshot(input: ManualRulesInput): RulesSnapshot {
  return {
    rules: {
      marketType: 'futures',
      accountSize: input.accountSize,
      drawdownType: input.drawdownType,
      drawdownAmount: input.drawdownAmount,
      profitTarget: input.profitTarget,
      dailyLossLimit: input.dailyLossLimit,
      consistencyPct: input.consistencyPct,
      minTradingDays: input.minTradingDays,
    },
    payout: input.payout,
    display: {
      firmName: input.firmName,
      planName: 'Compte personnalisé',
      firmSlug: '',
      planSlug: '',
      currency: input.currency,
      profitSplit: null,
      payoutModel: null,
    },
  };
}

/** Ligne `trades` (DB) → `Trade` du moteur (pur). */
export interface DbTradeRow {
  id: string;
  trade_date: string;
  closed_at: string;
  pnl: number | string;
  fees: number | string | null;
}

export function toEngineTrade(row: DbTradeRow): Trade {
  return {
    id: row.id,
    tradeDate: row.trade_date,
    closedAt: row.closed_at,
    pnl: Number(row.pnl),
    fees: row.fees === null ? 0 : Number(row.fees),
  };
}

/* -------- Libellés FR (i18n à recâbler à l'étape 7) -------- */

export const STATUS_LABELS: Record<RuleState, string> = {
  ok: 'Dans les règles',
  warning: 'Attention',
  danger: 'Zone rouge',
  passed: 'Challenge validé',
  failed: 'Compte perdu',
};

export const REASON_LABELS: Record<string, string> = {
  daily_loss_breached: 'Limite de perte journalière dépassée',
  drawdown_breached: 'Plancher de drawdown enfoncé',
  consistency_breached: 'Règle de cohérence non respectée',
  min_days_not_met: 'Nombre de jours de trading insuffisant',
};

export const BLOCKER_LABELS: Record<string, string> = {
  profit_days_not_met: 'Jours de profit requis non atteints',
  below_buffer: 'Solde sous le buffer',
  cycle_profit_not_met: 'Objectif de profit du cycle non atteint',
  consistency_breached: 'Règle de cohérence non respectée',
  below_min_withdrawal: 'Montant sous le minimum de retrait',
};
