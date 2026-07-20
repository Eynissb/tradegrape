/**
 * Tradawave — moteur de règles FUTURES.
 *
 * Fonction pure. Aucun accès réseau ni DB.
 *
 * Les trois types de drawdown du marché futures :
 *
 *  STATIC — plancher fixe : startingBalance - drawdownAmount. Ne bouge jamais.
 *
 *  EOD    — le plancher suit le plus haut solde de CLÔTURE de journée.
 *           Les gains intraday ne comptent pas tant que la journée n'est pas finie.
 *           Type le plus répandu, le plus confortable pour le scalping.
 *
 *  TRAIL  — le plancher suit le plus haut solde atteint, intraday compris.
 *           C'est le piège n°1 : un trader monte à +2000, redescend, et son
 *           plancher a déjà monté. Bien l'afficher est notre plus grande valeur.
 *
 * Note : on travaille sur des trades clôturés. Le "plus haut" est calculé sur la
 * courbe d'équité trade par trade (TRAIL) ou sur les clôtures journalières (EOD).
 * Un high-water intra-trade exigerait les ticks — hors périmètre.
 */

import type {
  GaugeResult,
  OfferRules,
  PayoutEvaluation,
  PayoutRules,
  RuleEvaluation,
  RuleState,
  Trade,
} from './types';

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const netPnl = (t: Trade): number => t.pnl - (t.fees ?? 0);

function sortTrades(trades: Trade[]): Trade[] {
  return [...trades].sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime(),
  );
}

/** Agrège les P&L par journée (clé YYYY-MM-DD). */
export function pnlByDay(trades: Trade[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of trades) {
    map.set(t.tradeDate, round2((map.get(t.tradeDate) ?? 0) + netPnl(t)));
  }
  return map;
}

function gaugeState(ratio: number): RuleState {
  if (ratio <= 0) return 'failed';
  if (ratio < 0.25) return 'danger';
  if (ratio < 0.5) return 'warning';
  return 'ok';
}

/** Plancher de drawdown courant + high-water mark de référence. */
export function computeDrawdownFloor(
  rules: OfferRules,
  startingBalance: number,
  trades: Trade[],
): { floor: number; highWaterMark: number } {
  const { drawdownType, drawdownAmount } = rules;

  if (drawdownType === 'STATIC') {
    return {
      floor: round2(startingBalance - drawdownAmount),
      highWaterMark: startingBalance,
    };
  }

  const sorted = sortTrades(trades);

  if (drawdownType === 'TRAIL') {
    let equity = startingBalance;
    let high = startingBalance;
    for (const t of sorted) {
      equity = round2(equity + netPnl(t));
      if (equity > high) high = equity;
    }
    // Beaucoup de firms figent le trailing quand le plancher atteint le capital
    // initial ("lock at breakeven"). C'est le comportement le plus courant.
    const rawFloor = round2(high - drawdownAmount);
    return { floor: Math.min(rawFloor, startingBalance), highWaterMark: high };
  }

  // EOD : plus haut solde de CLÔTURE journalière
  const byDay = pnlByDay(sorted);
  const days = [...byDay.keys()].sort();
  let equity = startingBalance;
  let high = startingBalance;
  for (const d of days) {
    equity = round2(equity + (byDay.get(d) ?? 0));
    if (equity > high) high = equity;
  }
  const rawFloor = round2(high - drawdownAmount);
  return { floor: Math.min(rawFloor, startingBalance), highWaterMark: high };
}

/**
 * Évalue un compte contre les règles de son offre.
 *
 * @param today date de référence YYYY-MM-DD pour le daily loss
 */
export function evaluateFuturesAccount(
  rules: OfferRules,
  startingBalance: number,
  trades: Trade[],
  today: string = new Date().toISOString().slice(0, 10),
): RuleEvaluation {
  const sorted = sortTrades(trades);
  const totalPnl = round2(sorted.reduce((s, t) => s + netPnl(t), 0));
  const balance = round2(startingBalance + totalPnl);

  const { floor, highWaterMark } = computeDrawdownFloor(rules, startingBalance, sorted);
  const byDay = pnlByDay(sorted);
  const reasons: string[] = [];

  // ---------- Daily loss ----------
  let dailyLoss: GaugeResult | null = null;
  if (rules.dailyLossLimit != null && rules.dailyLossLimit > 0) {
    const todayPnl = byDay.get(today) ?? 0;
    const used = todayPnl < 0 ? Math.abs(todayPnl) : 0;
    const remaining = round2(Math.max(0, rules.dailyLossLimit - used));
    const ratio = remaining / rules.dailyLossLimit;
    const state = gaugeState(ratio);
    if (state === 'failed') reasons.push('daily_loss_breached');
    dailyLoss = {
      value: remaining,
      limit: rules.dailyLossLimit,
      ratio: Math.max(0, Math.min(1, ratio)),
      state,
      label: 'daily_loss',
    };
  }

  // ---------- Drawdown ----------
  const room = round2(balance - floor);
  const ddRatio = Math.max(0, Math.min(1, room / rules.drawdownAmount));
  const ddState: RuleState = balance <= floor ? 'failed' : gaugeState(ddRatio);
  if (ddState === 'failed') reasons.push('drawdown_breached');

  const drawdown: GaugeResult = {
    value: room,
    limit: rules.drawdownAmount,
    ratio: ddRatio,
    state: ddState,
    label: 'drawdown',
  };

  // ---------- Objectif ----------
  let profitTarget: GaugeResult | null = null;
  if (rules.profitTarget != null && rules.profitTarget > 0) {
    const ratio = Math.max(0, Math.min(1, totalPnl / rules.profitTarget));
    profitTarget = {
      value: round2(Math.max(0, totalPnl)),
      limit: rules.profitTarget,
      ratio,
      state: ratio >= 1 ? 'passed' : 'ok',
      label: 'profit_target',
    };
  }

  // ---------- Cohérence ----------
  let consistency: GaugeResult | null = null;
  if (
    rules.consistencyPct != null &&
    rules.consistencyPct > 0 &&
    rules.consistencyPct < 100
  ) {
    const winning = [...byDay.values()].filter((v) => v > 0);
    const bestDay = winning.length ? Math.max(...winning) : 0;
    const gross = round2(winning.reduce((s, v) => s + v, 0));
    const bestPct = gross > 0 ? (bestDay / gross) * 100 : 0;
    const ok = bestPct <= rules.consistencyPct;
    if (!ok) reasons.push('consistency_breached');
    consistency = {
      value: round2(bestPct),
      limit: rules.consistencyPct,
      ratio: Math.max(0, Math.min(1, 1 - bestPct / rules.consistencyPct)),
      state: ok ? 'ok' : 'warning',
      label: 'consistency',
    };
  }

  // ---------- Jours de trading ----------
  const tradingDays = {
    count: byDay.size,
    required: rules.minTradingDays,
    met: byDay.size >= rules.minTradingDays,
  };
  if (!tradingDays.met) reasons.push('min_days_not_met');

  // ---------- Statut global ----------
  let status: RuleState = 'ok';
  if (ddState === 'failed' || dailyLoss?.state === 'failed') {
    status = 'failed';
  } else if (
    profitTarget?.state === 'passed' &&
    tradingDays.met &&
    (consistency?.state ?? 'ok') === 'ok'
  ) {
    status = 'passed';
  } else if (drawdown.state === 'danger' || dailyLoss?.state === 'danger') {
    status = 'danger';
  } else if (drawdown.state === 'warning' || dailyLoss?.state === 'warning') {
    status = 'warning';
  }

  const canPass =
    status !== 'failed' &&
    (profitTarget == null || profitTarget.ratio >= 1) &&
    tradingDays.met &&
    (consistency == null || consistency.state === 'ok');

  return {
    balance,
    netProfit: totalPnl,
    dailyLoss,
    drawdown,
    profitTarget,
    consistency,
    tradingDays,
    drawdownFloor: floor,
    highWaterMark,
    status,
    reasons,
    canPass,
  };
}

/**
 * Évalue l'éligibilité à un retrait en compte financé.
 *
 * C'est le calcul que les comparateurs documentent en prose mais n'exécutent
 * jamais. Ici on répond concrètement : « il te manque X $ et Y jours ».
 *
 * @param trades trades du CYCLE en cours (depuis le dernier payout)
 */
export function evaluatePayout(
  payout: PayoutRules,
  startingBalance: number,
  currentBalance: number,
  trades: Trade[],
): PayoutEvaluation {
  const byDay = pnlByDay(trades);
  const cycleProfit = round2(currentBalance - startingBalance);
  const blockers: string[] = [];

  // Jours de profit du cycle
  const threshold = payout.dailyThreshold ?? 0;
  const profitDayCount = [...byDay.values()].filter((v) => v > threshold).length;
  const requiredDays = payout.minProfitDays ?? 0;
  const daysMet = profitDayCount >= requiredDays;
  if (!daysMet) blockers.push('profit_days_not_met');

  // Buffer : on ne retire que ce qui dépasse
  const buffer = payout.buffer ?? 0;
  const aboveBuffer = round2(Math.max(0, currentBalance - buffer));
  const bufferGap = round2(Math.max(0, buffer - currentBalance));
  if (buffer > 0 && currentBalance <= buffer) blockers.push('below_buffer');

  // Objectif minimum du cycle
  const minCycle = payout.minCycleProfit ?? 0;
  const cycleGap = round2(Math.max(0, minCycle - cycleProfit));
  if (cycleGap > 0) blockers.push('cycle_profit_not_met');

  // Cohérence en funded
  let consistency: GaugeResult | null = null;
  if (payout.consistencyPct != null && payout.consistencyPct > 0 && payout.consistencyPct < 100) {
    const winning = [...byDay.values()].filter((v) => v > 0);
    const bestDay = winning.length ? Math.max(...winning) : 0;
    const gross = round2(winning.reduce((s, v) => s + v, 0));
    const bestPct = gross > 0 ? (bestDay / gross) * 100 : 0;
    const ok = bestPct <= payout.consistencyPct;
    if (!ok) blockers.push('consistency_breached');
    consistency = {
      value: round2(bestPct),
      limit: payout.consistencyPct,
      ratio: Math.max(0, Math.min(1, 1 - bestPct / payout.consistencyPct)),
      state: ok ? 'ok' : 'warning',
      label: 'payout_consistency',
    };
  }

  // Montant retirable : plafonné en montant et en %
  let withdrawable = aboveBuffer;
  if (payout.maxPct != null) {
    withdrawable = Math.min(withdrawable, round2(cycleProfit * (payout.maxPct / 100)));
  }
  if (payout.maxAmount != null) {
    withdrawable = Math.min(withdrawable, payout.maxAmount);
  }
  withdrawable = round2(Math.max(0, withdrawable));

  if (payout.minAmount != null && withdrawable < payout.minAmount) {
    blockers.push('below_min_withdrawal');
  }

  return {
    eligible: blockers.length === 0,
    // On expose toujours le montant calculé : l'utilisateur veut savoir ce
    // qu'il pourra retirer une fois les blocages levés.
    withdrawable,
    missing: {
      profitDays: Math.max(0, requiredDays - profitDayCount),
      cycleProfit: cycleGap,
      buffer: bufferGap,
    },
    profitDays: { count: profitDayCount, required: requiredDays, met: daysMet },
    bufferGap,
    consistency,
    blockers,
  };
}

/** Sélecteur de moteur par marché. Le forex se branchera ici sans refonte. */
export function evaluateAccount(
  rules: OfferRules,
  startingBalance: number,
  trades: Trade[],
  today?: string,
): RuleEvaluation {
  switch (rules.marketType) {
    case 'futures':
      return evaluateFuturesAccount(rules, startingBalance, trades, today);
    default:
      throw new Error(`Moteur non implémenté pour le marché : ${rules.marketType}`);
  }
}
