import { rootSymbol } from './asset-class';
import type { RuleEvaluation } from '../rules/types';

/**
 * Instruments futures — tick size et VALEUR du tick par contrat.
 *
 * Volontairement limité aux micros/minis les plus tradés en prop firm, pas au
 * catalogue CME complet : dix à quinze lignes couvrent l'essentiel des
 * utilisateurs, extensible ensuite. Table en dur (comme `SYMBOL_ROOTS`), donc
 * le calcul reste PUR et testable sans DB (CLAUDE.md §8). Une table Supabase
 * éditable en admin viendra le jour où l'on voudra la compléter à chaud.
 *
 * `tickValue` = gain/perte en devise pour un mouvement d'UN tick, UN contrat.
 * Source : spécifications de contrat CME (juillet 2026).
 */
export interface Instrument {
  root: string;
  label: string;
  tickSize: number;
  tickValue: number;
  currency: string;
  micro: boolean;
}

export const INSTRUMENTS: Readonly<Record<string, Instrument>> = {
  // Indices
  ES:  { root: 'ES',  label: 'E-mini S&P 500',    tickSize: 0.25, tickValue: 12.5, currency: 'USD', micro: false },
  MES: { root: 'MES', label: 'Micro E-mini S&P',  tickSize: 0.25, tickValue: 1.25, currency: 'USD', micro: true },
  NQ:  { root: 'NQ',  label: 'E-mini Nasdaq 100', tickSize: 0.25, tickValue: 5,    currency: 'USD', micro: false },
  MNQ: { root: 'MNQ', label: 'Micro E-mini Nasdaq', tickSize: 0.25, tickValue: 0.5, currency: 'USD', micro: true },
  YM:  { root: 'YM',  label: 'E-mini Dow',        tickSize: 1,    tickValue: 5,    currency: 'USD', micro: false },
  MYM: { root: 'MYM', label: 'Micro E-mini Dow',  tickSize: 1,    tickValue: 0.5,  currency: 'USD', micro: true },
  RTY: { root: 'RTY', label: 'E-mini Russell 2000', tickSize: 0.1, tickValue: 5,   currency: 'USD', micro: false },
  M2K: { root: 'M2K', label: 'Micro E-mini Russell', tickSize: 0.1, tickValue: 0.5, currency: 'USD', micro: true },
  // Métaux
  GC:  { root: 'GC',  label: 'Gold',              tickSize: 0.1,  tickValue: 10,   currency: 'USD', micro: false },
  MGC: { root: 'MGC', label: 'Micro Gold',        tickSize: 0.1,  tickValue: 1,    currency: 'USD', micro: true },
  // Énergie
  CL:  { root: 'CL',  label: 'Crude Oil',         tickSize: 0.01, tickValue: 10,   currency: 'USD', micro: false },
  MCL: { root: 'MCL', label: 'Micro Crude Oil',   tickSize: 0.01, tickValue: 1,    currency: 'USD', micro: true },
};

/** Ordonné micros d'abord (l'usage prop firm), puis par label — pour un select. */
export const INSTRUMENT_LIST: readonly Instrument[] = Object.values(INSTRUMENTS).sort((a, b) =>
  a.micro !== b.micro ? (a.micro ? -1 : 1) : a.label.localeCompare(b.label),
);

/** Résout un symbole saisi (« MNQU6 », « mnq ») vers son instrument, ou null. */
export function lookupInstrument(symbol: string): Instrument | null {
  const s = symbol.trim().toUpperCase();
  return INSTRUMENTS[s] ?? INSTRUMENTS[rootSymbol(s)] ?? null;
}

/* -------------------------------------------------------- budget de risque */

export interface RiskBudget {
  /** Montant réellement disponible avant de perdre le compte. Jamais négatif. */
  amount: number;
  /** Ce qui borne le budget : la perte journalière, le plancher, ou les deux
   *  à égalité. La distinction dit au trader ce qui le contraint. */
  limitedBy: 'daily' | 'drawdown';
}

/**
 * Budget de risque réel avant trade = le plus contraignant de deux plafonds :
 * la perte journalière restante ET la marge avant le plancher de drawdown.
 *
 * C'est le point que les concurrents décrivent en prose sans l'exécuter :
 * respecter le daily loss ne suffit pas si le trade casse le plancher. On prend
 * donc le minimum. Quand il n'y a pas de daily loss, seul le plancher borne.
 */
export function riskBudget(ev: RuleEvaluation): RiskBudget {
  const drawdownRoom = Math.max(0, ev.drawdown.value);
  const dailyRemaining = ev.dailyLoss ? Math.max(0, ev.dailyLoss.value) : null;

  // Le daily loss ne borne que s'il existe ET qu'il est strictement plus serré
  // que le plancher. À égalité, on nomme le plancher : c'est la contrainte qui
  // fait perdre le compte, pas seulement la journée.
  if (dailyRemaining !== null && dailyRemaining < drawdownRoom) {
    return { amount: dailyRemaining, limitedBy: 'daily' };
  }
  return { amount: drawdownRoom, limitedBy: 'drawdown' };
}

/* ---------------------------------------------------------- dimensionnement */

export interface RiskSizing {
  /** Perte encourue par contrat au stop donné (ticks × valeur du tick). */
  riskPerContract: number;
  /** Contrats maximum tenables dans le budget (arrondi au plancher). */
  maxContracts: number;
  /** Risque réellement engagé si l'on prend `maxContracts`. */
  riskAtMax: number;
}

/**
 * « Avec ton budget restant, tu peux prendre X contrats avec un stop de Y
 * ticks. » Fonction pure : ni instrument ni évaluation, seulement des nombres.
 * Renvoie null si les entrées ne permettent aucun calcul (stop ou valeur nuls).
 */
export function computeRiskSizing(params: {
  budget: number;
  tickValue: number;
  stopTicks: number;
}): RiskSizing | null {
  const { budget, tickValue, stopTicks } = params;
  if (stopTicks <= 0 || tickValue <= 0) return null;

  const riskPerContract = round2(stopTicks * tickValue);
  const maxContracts = riskPerContract > 0 ? Math.max(0, Math.floor(budget / riskPerContract)) : 0;
  return {
    riskPerContract,
    maxContracts,
    riskAtMax: round2(maxContracts * riskPerContract),
  };
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
