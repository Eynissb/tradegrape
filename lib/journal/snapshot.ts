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

export function buildRulesSnapshot(
  offer: OfferRuleRow,
  marketType: OfferRules['marketType'],
  firm: { name: string; slug: string },
  plan: { name: string; slug: string },
): RulesSnapshot {
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
    },
    payout: {
      buffer: n(offer.payout_buffer),
      minAmount: n(offer.payout_min_amount),
      minProfitDays: n(offer.payout_min_days),
      dailyThreshold: n(offer.payout_daily_threshold),
      consistencyPct: n(offer.funded_consistency_pct),
      // Les plafonds de cycle vivent dans offer_payout_caps — intégrés plus tard.
      minCycleProfit: null,
      maxAmount: null,
      maxPct: null,
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
