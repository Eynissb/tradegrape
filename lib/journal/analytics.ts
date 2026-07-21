/**
 * Analytics du journal — fonctions PURES (ni réseau ni DB), comme le moteur.
 *
 * Les calculs de RÈGLES (plancher de drawdown) réutilisent `futures-engine`.
 * On ne réimplémente jamais un calcul de règle ici.
 *
 * Deux granularités dans `trades` : entrée journalière (`symbol === ''`) et
 * trade détaillé. Les stats par symbole et par heure **excluent** les entrées
 * journalières — elles n'ont ni symbole ni heure réels et créeraient une
 * catégorie parasite.
 */

import type { OfferRules, Trade } from '../rules/types';
import { computeDrawdownFloor } from '../rules/futures-engine';
import { tagLabel } from './tags';

export interface AnalyticsTrade extends Trade {
  /** '' pour une entrée journalière. */
  symbol: string;
  tags: string[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const net = (t: AnalyticsTrade): number => t.pnl - (t.fees ?? 0);
const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const byClosed = (a: AnalyticsTrade, b: AnalyticsTrade): number =>
  new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime();

/* ------------------------------------------------------------------ métriques */

export interface Metrics {
  entries: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number | null; // %
  netPnl: number;
  grossWin: number;
  grossLoss: number; // magnitude positive
  avgWin: number;
  avgLoss: number; // magnitude positive
  expectancy: number; // P&L net moyen par entrée
  avgR: number | null; // expectancy / perte moyenne (1R = perte moyenne)
  profitFactor: number | null; // gains bruts / pertes brutes ; null si aucune perte
  maxWinStreak: number;
  maxLossStreak: number;
}

export function computeMetrics(trades: AnalyticsTrade[]): Metrics {
  const nets = trades.map(net);
  const wins = nets.filter((v) => v > 0);
  const losses = nets.filter((v) => v < 0);
  const breakeven = nets.filter((v) => v === 0).length;

  const grossWin = round2(wins.reduce((s, v) => s + v, 0));
  const grossLoss = round2(Math.abs(losses.reduce((s, v) => s + v, 0)));
  const netPnl = round2(nets.reduce((s, v) => s + v, 0));
  const entries = trades.length;
  const decided = wins.length + losses.length;

  const avgWin = wins.length ? round2(grossWin / wins.length) : 0;
  const avgLoss = losses.length ? round2(grossLoss / losses.length) : 0;
  const expectancy = entries ? round2(netPnl / entries) : 0;

  // Enchaînements chronologiques
  const chrono = [...trades].sort(byClosed);
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of chrono) {
    const v = net(t);
    if (v > 0) {
      curWin += 1;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (v < 0) {
      curLoss += 1;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }

  return {
    entries,
    wins: wins.length,
    losses: losses.length,
    breakeven,
    winRate: decided ? round2((wins.length / decided) * 100) : null,
    netPnl,
    grossWin,
    grossLoss,
    avgWin,
    avgLoss,
    expectancy,
    avgR: avgLoss > 0 ? round2(expectancy / avgLoss) : null,
    profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
  };
}

/* --------------------------------------------------------------- ventilations */

export interface Bucket {
  key: string;
  label: string;
  entries: number;
  netPnl: number;
  winRate: number | null;
}

/** keyOf renvoie 0..N clés pour un trade (plusieurs pour les tags), ou null pour l'ignorer. */
function bucketize(
  trades: AnalyticsTrade[],
  keyOf: (t: AnalyticsTrade) => string[] | null,
  labelOf: (key: string) => string,
): Bucket[] {
  const groups = new Map<string, AnalyticsTrade[]>();
  for (const t of trades) {
    const keys = keyOf(t);
    if (!keys) continue;
    for (const k of keys) {
      const arr = groups.get(k);
      if (arr) arr.push(t);
      else groups.set(k, [t]);
    }
  }
  return [...groups.entries()].map(([key, ts]) => {
    const nets = ts.map(net);
    const decided = nets.filter((v) => v > 0).length + nets.filter((v) => v < 0).length;
    return {
      key,
      label: labelOf(key),
      entries: ts.length,
      netPnl: round2(nets.reduce((s, v) => s + v, 0)),
      winRate: decided ? round2((nets.filter((v) => v > 0).length / decided) * 100) : null,
    };
  });
}

const WEEKDAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Indice lundi=0 à partir d'une date YYYY-MM-DD (UTC, stable). */
function weekdayIndex(date: string): number {
  const d = new Date(`${date}T00:00:00.000Z`).getUTCDay(); // 0=dim
  return (d + 6) % 7;
}

function hourOf(closedAt: string | Date): number {
  return new Date(closedAt).getUTCHours();
}

const byEntriesDesc = (a: Bucket, b: Bucket): number =>
  b.entries - a.entries || b.netPnl - a.netPnl || a.label.localeCompare(b.label);

/* ---------------------------------------------------------------- distribution */

export interface DistributionBin {
  label: string;
  from: number;
  to: number;
  count: number;
}

/** Histogramme symétrique autour de 0 (8 tranches) sur le P&L net par entrée. */
export function buildDistribution(trades: AnalyticsTrade[]): DistributionBin[] {
  if (trades.length === 0) return [];
  const nets = trades.map(net);
  const maxAbs = Math.max(1, ...nets.map((v) => Math.abs(v)));
  const BINS = 8;
  const width = maxAbs / (BINS / 2);
  const bins: DistributionBin[] = [];
  for (let i = -BINS / 2; i < BINS / 2; i++) {
    const from = round2(i * width);
    const to = round2((i + 1) * width);
    bins.push({ label: '', from, to, count: 0 });
  }
  for (const v of nets) {
    let idx = Math.floor(v / width) + BINS / 2;
    if (idx < 0) idx = 0;
    if (idx >= BINS) idx = BINS - 1;
    bins[idx].count += 1;
  }
  return bins;
}

/* ---------------------------------------------------------------- courbe équité */

export interface EquityPoint {
  date: string; // YYYY-MM-DD
  equity: number;
  floor: number;
}

/**
 * Courbe d'équité journalière avec le plancher de drawdown superposé.
 * Le plancher à chaque jour est calculé par le MOTEUR sur tout l'historique
 * jusqu'à ce jour (le trailing dépend de l'historique complet) — jamais
 * réimplémenté ici.
 */
export function buildEquityCurve(
  rules: OfferRules,
  startingBalance: number,
  allTrades: AnalyticsTrade[],
): EquityPoint[] {
  if (allTrades.length === 0) return [];
  const byDay = new Map<string, number>();
  for (const t of allTrades) byDay.set(t.tradeDate, round2((byDay.get(t.tradeDate) ?? 0) + net(t)));
  const days = [...byDay.keys()].sort();

  const points: EquityPoint[] = [];
  let equity = startingBalance;
  for (const d of days) {
    equity = round2(equity + (byDay.get(d) ?? 0));
    const prefix = allTrades.filter((t) => t.tradeDate <= d);
    const { floor } = computeDrawdownFloor(rules, startingBalance, prefix);
    points.push({ date: d, equity, floor });
  }
  return points;
}

/* -------------------------------------------------------------------- période */

export type PeriodPreset = 'month' | 'quarter' | 'all' | 'custom';

export interface ResolvedRange {
  preset: PeriodPreset;
  from: string; // YYYY-MM-DD inclus
  to: string; // YYYY-MM-DD inclus
}

/** Résout un préréglage de période en bornes de dates. `today` = YYYY-MM-DD. */
export function resolveRange(
  preset: PeriodPreset,
  today: string,
  allTrades: AnalyticsTrade[],
  customFrom?: string,
  customTo?: string,
): ResolvedRange {
  const to = today;
  if (preset === 'custom' && customFrom && customTo) {
    return { preset: 'custom', from: customFrom, to: customTo };
  }
  if (preset === 'month') {
    return { preset: 'month', from: `${today.slice(0, 7)}-01`, to };
  }
  if (preset === 'quarter') {
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7)); // 1-12
    const qStart = Math.floor((month - 1) / 3) * 3 + 1;
    return { preset: 'quarter', from: `${year}-${pad2(qStart)}-01`, to };
  }
  const first = allTrades.length
    ? [...allTrades].map((t) => t.tradeDate).sort()[0]
    : today;
  return { preset: 'all', from: first, to };
}

/* ---------------------------------------------------------------- agrégateur */

export interface Analytics {
  range: ResolvedRange;
  rangeEntries: number;
  metrics: Metrics;
  bySymbol: Bucket[];
  byWeekday: Bucket[];
  byHour: Bucket[];
  bySetup: Bucket[];
  byEmotion: Bucket[];
  distribution: DistributionBin[];
  /** Courbe restreinte à la période affichée (valeurs absolues, plancher réel). */
  equity: EquityPoint[];
}

function famKeys(t: AnalyticsTrade, family: 'setup' | 'emotion'): string[] | null {
  const keys = t.tags.filter((tag) => tag.startsWith(`${family}:`));
  return keys.length ? keys : null;
}

export function buildAnalytics(params: {
  rules: OfferRules;
  startingBalance: number;
  allTrades: AnalyticsTrade[];
  range: ResolvedRange;
}): Analytics {
  const { rules, startingBalance, allTrades, range } = params;
  const windowed = allTrades.filter((t) => t.tradeDate >= range.from && t.tradeDate <= range.to);

  const bySymbol = bucketize(windowed, (t) => (t.symbol ? [t.symbol] : null), (k) => k).sort(
    byEntriesDesc,
  );
  const byWeekday = bucketize(
    windowed,
    (t) => [String(weekdayIndex(t.tradeDate))],
    (k) => WEEKDAYS_FR[Number(k)],
  ).sort((a, b) => Number(a.key) - Number(b.key));
  const byHour = bucketize(
    windowed,
    (t) => (t.symbol ? [pad2(hourOf(t.closedAt))] : null),
    (k) => `${k}h`,
  ).sort((a, b) => Number(a.key) - Number(b.key));
  const bySetup = bucketize(windowed, (t) => famKeys(t, 'setup'), tagLabel).sort(byEntriesDesc);
  const byEmotion = bucketize(windowed, (t) => famKeys(t, 'emotion'), tagLabel).sort(byEntriesDesc);

  const fullEquity = buildEquityCurve(rules, startingBalance, allTrades);

  return {
    range,
    rangeEntries: windowed.length,
    metrics: computeMetrics(windowed),
    bySymbol,
    byWeekday,
    byHour,
    bySetup,
    byEmotion,
    distribution: buildDistribution(windowed),
    equity: fullEquity.filter((p) => p.date >= range.from && p.date <= range.to),
  };
}
