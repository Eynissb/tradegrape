import { pnlByDay } from '../rules/futures-engine';
import { computeMetrics, type AnalyticsTrade } from './analytics';
import { computeDiscipline, type Discipline } from './discipline';
import type { OfferRules } from '../rules/types';

/**
 * Revue hebdomadaire — la SYNTHÈSE d'une semaine, recalculée à la volée. Les
 * réponses libres du trader sont stockées à part (table journal_reviews) ;
 * ici, uniquement les chiffres, tous dérivés du moteur et des analytics.
 * Pure : ni réseau ni DB.
 *
 * La semaine court du LUNDI au dimanche (comme le calendrier), identifiée par
 * la date de son lundi.
 */

export interface DayPoint {
  date: string;
  pnl: number;
}

export interface WeekReview {
  weekStart: string; // lundi YYYY-MM-DD
  weekEnd: string; // dimanche YYYY-MM-DD
  prevWeek: string;
  nextWeek: string;
  label: string; // « 20 – 26 juil. 2026 »
  pnl: number;
  entries: number;
  tradingDays: number;
  winRate: number | null;
  bestDay: DayPoint | null;
  worstDay: DayPoint | null;
  discipline: Discipline;
}

/* -------------------------------------------------------------- dates (UTC) */

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function addDays(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

/** Lundi de la semaine contenant `isoDate`. */
export function mondayOf(isoDate: string): string {
  const d = parse(isoDate);
  const offset = (d.getUTCDay() + 6) % 7; // dim=0 → 6, lun=1 → 0
  d.setUTCDate(d.getUTCDate() - offset);
  return iso(d);
}

const RANGE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const RANGE_FMT_Y = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
function weekLabel(start: string, end: string): string {
  return `${RANGE_FMT.format(parse(start))} – ${RANGE_FMT_Y.format(parse(end))}`;
}

/* --------------------------------------------------------------- construction */

export function buildWeekReview(
  rules: OfferRules,
  startingBalance: number,
  allTrades: AnalyticsTrade[],
  week: string,
): WeekReview {
  const weekStart = mondayOf(week);
  const weekEnd = addDays(weekStart, 6);

  const windowed = allTrades.filter((t) => t.tradeDate >= weekStart && t.tradeDate <= weekEnd);
  const metrics = computeMetrics(windowed);
  const dayPnl = pnlByDay(windowed);

  let bestDay: DayPoint | null = null;
  let worstDay: DayPoint | null = null;
  for (const [date, pnl] of dayPnl) {
    if (bestDay === null || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (worstDay === null || pnl < worstDay.pnl) worstDay = { date, pnl };
  }

  return {
    weekStart,
    weekEnd,
    prevWeek: addDays(weekStart, -7),
    nextWeek: addDays(weekStart, 7),
    label: weekLabel(weekStart, weekEnd),
    pnl: metrics.netPnl,
    entries: windowed.length,
    tradingDays: dayPnl.size,
    winRate: metrics.winRate,
    bestDay,
    worstDay,
    // La discipline de la semaine se juge sur les seuls trades de la semaine.
    discipline: computeDiscipline(rules, startingBalance, windowed),
  };
}
