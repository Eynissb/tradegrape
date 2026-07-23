/**
 * Construction pure de la grille mensuelle du journal (semaine du lundi au dimanche).
 * Aucune dépendance moteur/DB : reçoit des Map jour→valeur déjà calculées.
 */

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export type DailyLossFlag = 'none' | 'approached' | 'breached';

/** Fraction du daily loss à partir de laquelle un jour est « approché ».
 *  Définition UNIQUE partagée par le calendrier, les insights et le score de
 *  discipline — auparavant divergente (0,75 ici, 0,8 dans les insights). */
export const DAILY_LOSS_APPROACH_RATIO = 0.8;

/** État du daily loss pour UN jour, d'après son P&L et la limite de l'offre. */
export function dailyLossFlag(pnl: number | null, limit: number | null): DailyLossFlag {
  if (!limit || limit <= 0 || pnl === null || pnl >= 0) return 'none';
  const loss = Math.abs(pnl);
  if (loss >= limit) return 'breached';
  if (loss >= DAILY_LOSS_APPROACH_RATIO * limit) return 'approached';
  return 'none';
}

export interface DayCell {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  weekend: boolean;
  pnl: number | null;
  trades: number;
  isTradingDay: boolean;
  dailyLoss: DailyLossFlag;
  isConsistencyBreaker: boolean;
}

export interface WeekRow {
  days: DayCell[];
  total: number;
  hasData: boolean;
}

export interface MonthView {
  year: number;
  month: number; // 0-11
  label: string;
  weeks: WeekRow[];
  prev: string; // "YYYY-MM"
  next: string;
  maxAbs: number; // pour l'intensité des couleurs
}

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const ymd = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

/** "YYYY-MM" → {year, month0-11}, sinon fallback. */
export function parseMonth(
  param: string | undefined,
  fallback: { year: number; month: number },
): { year: number; month: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  return fallback;
}

export interface MonthInput {
  year: number;
  month: number;
  pnlByDay: Map<string, number>;
  countByDay: Map<string, number>;
  dailyLossLimit: number | null;
  breakerDay: string | null;
}

export function buildMonthView(input: MonthInput): MonthView {
  const { year, month, pnlByDay, countByDay, dailyLossLimit, breakerDay } = input;

  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: DayCell[] = [];
  let maxAbs = 0;

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(Date.UTC(year, month, 1 - startOffset + i));
    const cy = d.getUTCFullYear();
    const cm = d.getUTCMonth();
    const cd = d.getUTCDate();
    const dow = d.getUTCDay();
    const date = ymd(cy, cm, cd);
    const inMonth = cm === month && cy === year;
    const pnl = pnlByDay.has(date) ? (pnlByDay.get(date) as number) : null;
    const trades = countByDay.get(date) ?? 0;

    const dailyLoss = dailyLossFlag(pnl, dailyLossLimit);

    if (inMonth && pnl !== null) maxAbs = Math.max(maxAbs, Math.abs(pnl));

    cells.push({
      date,
      day: cd,
      inMonth,
      weekend: dow === 0 || dow === 6,
      pnl,
      trades,
      isTradingDay: trades > 0,
      dailyLoss,
      isConsistencyBreaker: !!breakerDay && date === breakerDay,
    });
  }

  const weeks: WeekRow[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const days = cells.slice(i, i + 7);
    const total = days.reduce((s, c) => s + (c.inMonth && c.pnl !== null ? c.pnl : 0), 0);
    weeks.push({
      days,
      total: Math.round(total * 100) / 100,
      hasData: days.some((c) => c.inMonth && c.pnl !== null),
    });
  }

  const prev = month === 0 ? monthKey(year - 1, 11) : monthKey(year, month - 1);
  const next = month === 11 ? monthKey(year + 1, 0) : monthKey(year, month + 1);

  return { year, month, label: `${MONTHS_FR[month]} ${year}`, weeks, prev, next, maxAbs };
}
