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
import { computeDrawdownFloor, evaluateAccount, pnlByDay } from '../rules/futures-engine';
import { computeDiscipline, type Discipline } from './discipline';
import { tagLabel } from './tags';

export interface AnalyticsTrade extends Trade {
  /** '' pour une entrée journalière. */
  symbol: string;
  tags: string[];
  /** 'long' | 'short' pour un trade détaillé, null/absent pour une entrée journalière. */
  direction?: string | null;
  /** Durée du trade en secondes (trades détaillés horodatés). */
  durationSec?: number | null;
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
  largestWin: number; // plus gros gain net d'une entrée (0 si aucun gain)
  largestLoss: number; // plus grosse perte nette, magnitude positive (0 si aucune perte)
  /** Durée moyenne des trades détaillés horodatés, en secondes. null si aucun. */
  avgDurationSec: number | null;
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
  const largestWin = wins.length ? round2(Math.max(...wins)) : 0;
  const largestLoss = losses.length ? round2(Math.abs(Math.min(...losses))) : 0;

  // Durée moyenne : uniquement les trades détaillés dont la durée est renseignée.
  const durations = trades
    .map((t) => t.durationSec)
    .filter((d): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0);
  const avgDurationSec = durations.length
    ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    : null;

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
    largestWin,
    largestLoss,
    avgDurationSec,
  };
}

/* ----------------------------------------------------------- métriques /jour */

export interface DayMetrics {
  tradingDays: number;
  winningDays: number;
  losingDays: number;
  breakevenDays: number;
  /** % de jours gagnants parmi les jours décidés (G+P). null si aucun. */
  dayWinRate: number | null;
  /** P&L net moyen d'un jour tradé (net total / nb de jours). */
  avgDailyPnl: number;
  /** Nombre moyen d'entrées par jour tradé. */
  avgTradesPerDay: number | null;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  /** Plus longues séries de jours consécutifs gagnants / perdants. */
  maxWinDayStreak: number;
  maxLossDayStreak: number;
}

/**
 * Métriques agrégées au niveau du JOUR (et non du trade) — Day Win %, séries de
 * jours, P&L journalier moyen, meilleur/pire jour. Standard des journaux de
 * référence (TradeZella « Day Win % »), distinct des métriques par trade : un
 * trader peut avoir 40 % de trades gagnants mais 70 % de journées gagnantes.
 * Le P&L d'un jour = somme des P&L nets des entrées de ce jour. Fonction pure.
 */
export function computeDayMetrics(trades: AnalyticsTrade[]): DayMetrics {
  const pnlOf = new Map<string, number>();
  const countOf = new Map<string, number>();
  for (const t of trades) {
    pnlOf.set(t.tradeDate, round2((pnlOf.get(t.tradeDate) ?? 0) + net(t)));
    countOf.set(t.tradeDate, (countOf.get(t.tradeDate) ?? 0) + 1);
  }

  const days = [...pnlOf.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const tradingDays = days.length;

  let winningDays = 0;
  let losingDays = 0;
  let breakevenDays = 0;
  let netTotal = 0;
  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;

  for (const [date, pnl] of days) {
    netTotal = round2(netTotal + pnl);
    if (pnl > 0) winningDays++;
    else if (pnl < 0) losingDays++;
    else breakevenDays++;
    if (!bestDay || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (!worstDay || pnl < worstDay.pnl) worstDay = { date, pnl };

    if (pnl > 0) {
      curWin++;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (pnl < 0) {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }

  const decided = winningDays + losingDays;
  const totalEntries = [...countOf.values()].reduce((s, v) => s + v, 0);

  return {
    tradingDays,
    winningDays,
    losingDays,
    breakevenDays,
    dayWinRate: decided ? round2((winningDays / decided) * 100) : null,
    avgDailyPnl: tradingDays ? round2(netTotal / tradingDays) : 0,
    avgTradesPerDay: tradingDays ? round2(totalEntries / tradingDays) : null,
    bestDay,
    worstDay,
    maxWinDayStreak: maxWin,
    maxLossDayStreak: maxLoss,
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

/* ---------------------------------------------------------- drawdown constaté */

export interface MaxDrawdown {
  /** Repli pic→creux le plus grand, en valeur absolue (0 si aucun repli). */
  amount: number;
  /** Repli en % du pic. `null` quand le pic n'est pas strictement positif
   *  (cas d'une série de P&L cumulé, où un pourcentage n'aurait aucun sens). */
  pct: number | null;
  peakDate: string | null;
  troughDate: string | null;
}

/**
 * Plus grand repli pic→creux d'une série datée — le drawdown réellement SUBI,
 * à ne pas confondre avec le plancher de drawdown de la firm (qui est une
 * limite contractuelle calculée par le moteur).
 *
 * Fonction pure et agnostique du support : on lui passe une équité (compte) ou
 * un P&L cumulé (agrégat). Le montant est identique dans les deux cas — ajouter
 * une constante à toute la série ne change pas un écart pic→creux ; seul le
 * pourcentage dépend du pic, d'où son `null` quand celui-ci n'est pas positif.
 */
export function computeMaxDrawdown(series: { date: string; value: number }[]): MaxDrawdown {
  let peak = -Infinity;
  let peakDate: string | null = null;
  let worst = 0;
  let worstPeak = 0;
  let worstPeakDate: string | null = null;
  let worstTroughDate: string | null = null;

  for (const p of series) {
    if (p.value > peak) {
      peak = p.value;
      peakDate = p.date;
    }
    const decline = peak - p.value;
    if (decline > worst) {
      worst = decline;
      worstPeak = peak;
      worstPeakDate = peakDate;
      worstTroughDate = p.date;
    }
  }

  return {
    amount: round2(worst),
    pct: worst > 0 && worstPeak > 0 ? round2((worst / worstPeak) * 100) : null,
    peakDate: worst > 0 ? worstPeakDate : null,
    troughDate: worst > 0 ? worstTroughDate : null,
  };
}

/* ------------------------------------------------------ analyse de cohérence */

export interface ConsistencyAnalysis {
  /** La règle de cohérence s'applique-t-elle (seuil strict entre 0 et 100) ? */
  applies: boolean;
  /** Seuil de la firm en % (part max d'un seul jour dans le profit). */
  thresholdPct: number | null;
  /** Part du meilleur jour dans la somme des jours gagnants (%). null si aucun gain. */
  bestDaySharePct: number | null;
  /** Meilleur jour gagnant (celui qui pèse le plus). */
  bestDay: { date: string; pnl: number } | null;
  /** Somme des P&L des jours gagnants — base de la règle de cohérence. */
  grossWinningDays: number;
  /** Conforme aujourd'hui ? null si la règle ne s'applique pas ou aucun gain. */
  compliant: boolean | null;
  /**
   * Profit net supplémentaire (réparti sur d'AUTRES jours que le meilleur) qu'il
   * faudrait réaliser pour rendre le meilleur jour conforme au seuil. 0 si déjà
   * conforme ou non applicable. C'est le « profit needed for consistency » que
   * les concurrents décrivent sans jamais le chiffrer.
   */
  profitNeeded: number;
}

/**
 * Analyse de cohérence — la signature prop firm. On ne réimplémente pas la
 * RÈGLE (part max d'un jour) : on consomme le verdict du moteur
 * (`evaluateAccount().consistency`, value = part du meilleur jour, limit =
 * seuil) et on y ajoute deux choses que le moteur ne donne pas pour l'affichage :
 * quel jour est le meilleur, et combien de profit en plus rendrait le compte
 * conforme.
 *
 * `profitNeeded` : le seuil est `bestDay / gross ≤ t/100`. Ajouter du profit sur
 * d'autres jours augmente `gross` sans toucher `bestDay`, donc il faut
 * `gross ≥ bestDay·100/t`, soit `x = max(0, bestDay·100/t − gross)`.
 */
export function computeConsistencyAnalysis(
  rules: OfferRules,
  startingBalance: number,
  trades: Trade[],
): ConsistencyAnalysis {
  const ev = evaluateAccount(rules, startingBalance, trades);
  const cons = ev.consistency;

  const byDay = pnlByDay(trades);
  const winning = [...byDay.entries()].filter(([, v]) => v > 0);
  const grossWinningDays = round2(winning.reduce((s, [, v]) => s + v, 0));
  const best = winning.reduce<{ date: string; pnl: number } | null>(
    (acc, [date, pnl]) => (!acc || pnl > acc.pnl ? { date, pnl } : acc),
    null,
  );

  // La règle ne s'applique pas : pas de seuil exploitable.
  if (!cons) {
    return {
      applies: false,
      thresholdPct: null,
      bestDaySharePct: null,
      bestDay: best,
      grossWinningDays,
      compliant: null,
      profitNeeded: 0,
    };
  }

  const thresholdPct = cons.limit;
  const bestDaySharePct = grossWinningDays > 0 ? round2(cons.value) : null;
  const compliant = grossWinningDays > 0 ? cons.state === 'ok' : null;
  const profitNeeded =
    best && thresholdPct > 0 && compliant === false
      ? round2(Math.max(0, (best.pnl * 100) / thresholdPct - grossWinningDays))
      : 0;

  return {
    applies: true,
    thresholdPct,
    bestDaySharePct,
    bestDay: best,
    grossWinningDays,
    compliant,
    profitNeeded,
  };
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
  dayMetrics: DayMetrics;
  consistency: ConsistencyAnalysis;
  bySymbol: Bucket[];
  byDirection: Bucket[];
  byWeekday: Bucket[];
  byHour: Bucket[];
  bySetup: Bucket[];
  byEmotion: Bucket[];
  distribution: DistributionBin[];
  /** Courbe restreinte à la période affichée (valeurs absolues, plancher réel). */
  equity: EquityPoint[];
  /** Plus grand repli subi SUR LA PÉRIODE affichée (cf. `computeMaxDrawdown`). */
  maxDrawdown: MaxDrawdown;
  /** Score de discipline sur la période (cf. `computeDiscipline`). */
  discipline: Discipline;
}

function famKeys(t: AnalyticsTrade, family: 'setup' | 'emotion'): string[] | null {
  const keys = t.tags.filter((tag) => tag.startsWith(`${family}:`));
  return keys.length ? keys : null;
}

/** Clé de direction — seuls les trades détaillés en portent une (long/short). */
function directionKeys(t: AnalyticsTrade): string[] | null {
  if (t.direction === 'long' || t.direction === 'short') return [t.direction];
  return null;
}
const directionLabel = (k: string): string => (k === 'long' ? 'Long' : k === 'short' ? 'Short' : k);

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
  const byDirection = bucketize(windowed, directionKeys, directionLabel).sort(byEntriesDesc);
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
  const windowedEquity = fullEquity.filter((p) => p.date >= range.from && p.date <= range.to);

  /* Le pic est SEMÉ avec l'équité juste avant la période — sinon un repli
     survenu dès le premier jour affiché partirait d'un pic déjà entamé et
     serait sous-estimé. À défaut d'antériorité, c'est le capital initial. */
  const previous = fullEquity.filter((p) => p.date < range.from).at(-1);
  const seed = previous ? previous.equity : startingBalance;
  const maxDrawdown = computeMaxDrawdown([
    { date: previous?.date ?? range.from, value: seed },
    ...windowedEquity.map((p) => ({ date: p.date, value: p.equity })),
  ]);

  return {
    range,
    rangeEntries: windowed.length,
    metrics: computeMetrics(windowed),
    dayMetrics: computeDayMetrics(windowed),
    consistency: computeConsistencyAnalysis(rules, startingBalance, windowed),
    maxDrawdown,
    bySymbol,
    byDirection,
    byWeekday,
    byHour,
    bySetup,
    byEmotion,
    distribution: buildDistribution(windowed),
    equity: windowedEquity,
    discipline: computeDiscipline(rules, startingBalance, windowed),
  };
}

/* ------------------------------------------------- agrégat multi-comptes */

export interface AggregateTrade extends AnalyticsTrade {
  accountId: string;
  accountLabel: string;
}

export interface CumulativePoint {
  date: string;
  pnl: number; // P&L net cumulé (pas de plancher : les règles sont par compte)
}

export interface AggregateAnalytics {
  range: ResolvedRange;
  rangeEntries: number;
  accounts: number;
  metrics: Metrics;
  dayMetrics: DayMetrics;
  bySymbol: Bucket[];
  byDirection: Bucket[];
  byWeekday: Bucket[];
  byHour: Bucket[];
  bySetup: Bucket[];
  byEmotion: Bucket[];
  byAccount: Bucket[];
  distribution: DistributionBin[];
  cumulative: CumulativePoint[];
  /** Repli max du P&L cumulé sur la période, tous comptes confondus.
   *  `pct` y vaut le plus souvent `null` : un pourcentage rapporté à un pic de
   *  P&L cumulé (qui part de zéro) n'aurait pas de sens. */
  maxDrawdown: MaxDrawdown;
}

/** P&L net cumulé jour par jour, tous comptes confondus (sans plancher). */
export function buildCumulative(trades: AnalyticsTrade[]): CumulativePoint[] {
  if (trades.length === 0) return [];
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.tradeDate, round2((byDay.get(t.tradeDate) ?? 0) + net(t)));
  let cum = 0;
  return [...byDay.keys()].sort().map((d) => {
    cum = round2(cum + (byDay.get(d) ?? 0));
    return { date: d, pnl: cum };
  });
}

/**
 * Analytics consolidées sur plusieurs comptes. Seules les analytics s'agrègent —
 * les jauges de règles restent par compte (chaque offre a ses propres règles),
 * donc pas de plancher de drawdown ici : la courbe est le P&L net cumulé.
 */
export function buildAggregateAnalytics(params: {
  allTrades: AggregateTrade[];
  range: ResolvedRange;
}): AggregateAnalytics {
  const { allTrades, range } = params;
  const windowed = allTrades.filter((t) => t.tradeDate >= range.from && t.tradeDate <= range.to);

  const labels = new Map<string, string>();
  for (const t of windowed) if (!labels.has(t.accountId)) labels.set(t.accountId, t.accountLabel);

  const cumulative = buildCumulative(windowed);

  return {
    range,
    rangeEntries: windowed.length,
    accounts: labels.size,
    metrics: computeMetrics(windowed),
    dayMetrics: computeDayMetrics(windowed),
    bySymbol: bucketize(windowed, (t) => (t.symbol ? [t.symbol] : null), (k) => k).sort(byEntriesDesc),
    byDirection: bucketize(windowed, directionKeys, directionLabel).sort(byEntriesDesc),
    byWeekday: bucketize(windowed, (t) => [String(weekdayIndex(t.tradeDate))], (k) => WEEKDAYS_FR[Number(k)]).sort(
      (a, b) => Number(a.key) - Number(b.key),
    ),
    byHour: bucketize(windowed, (t) => (t.symbol ? [pad2(hourOf(t.closedAt))] : null), (k) => `${k}h`).sort(
      (a, b) => Number(a.key) - Number(b.key),
    ),
    bySetup: bucketize(windowed, (t) => famKeys(t, 'setup'), tagLabel).sort(byEntriesDesc),
    byEmotion: bucketize(windowed, (t) => famKeys(t, 'emotion'), tagLabel).sort(byEntriesDesc),
    byAccount: bucketize(windowed, (t) => [(t as AggregateTrade).accountId], (id) => labels.get(id) ?? id).sort(
      byEntriesDesc,
    ),
    distribution: buildDistribution(windowed),
    cumulative,
    /* Le cumulé démarre à zéro par construction : on sème le pic à 0 pour que
       la période qui commence par une perte compte bien son repli.
       Le POURCENTAGE est écarté : rapporté à un pic de P&L cumulé (220 € après
       deux jours, par exemple), il produit des « 110 % » qui ne veulent rien
       dire. Seul le montant est comparable entre comptes ; un ratio n'aurait de
       sens que rapporté au capital, qui diffère d'un compte à l'autre. */
    maxDrawdown: {
      ...computeMaxDrawdown([
        { date: range.from, value: 0 },
        ...cumulative.map((p) => ({ date: p.date, value: p.pnl })),
      ]),
      pct: null,
    },
  };
}
