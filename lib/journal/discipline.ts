import { evaluateAccount, pnlByDay } from '../rules/futures-engine';
import { dailyLossFlag, type DailyLossFlag } from './calendar';
import { consistencyBreakerDay } from './insights';
import type { OfferRules, Trade } from '../rules/types';

/**
 * Score de discipline — lié aux RÈGLES RÉELLES de la prop firm, pas une note
 * fourre-tout (CLAUDE.md §11). C'est un ratio concret : le pourcentage de jours
 * tradés où le trader a respecté ses limites.
 *
 * Deux entorses, toutes deux calculées par le moteur, toutes deux liées à la
 * survie du compte :
 *   · avoir approché (≥80 %) ou dépassé le daily loss ce jour-là ;
 *   · être LE jour qui casse la cohérence (sur-sizing sur un gain).
 *
 * Aucun coefficient : un jour est discipliné ou il ne l'est pas. Fonction pure.
 */

export interface DisciplineDay {
  date: string;
  dailyLoss: DailyLossFlag;
  /** Ce jour est celui qui déséquilibre la cohérence. Au plus un par période. */
  overSized: boolean;
  disciplined: boolean;
}

export interface Discipline {
  tradingDays: number;
  disciplinedDays: number;
  /** 0–100, arrondi. `null` s'il n'y a aucun jour tradé (rien à noter). */
  score: number | null;
  /** Jours ayant dépassé le daily loss. */
  breached: number;
  /** Jours l'ayant approché sans le dépasser. */
  approached: number;
  /** Jour(s) cassant la cohérence : 0 ou 1. */
  overSized: number;
  days: DisciplineDay[];
}

export function computeDiscipline(
  rules: OfferRules,
  startingBalance: number,
  trades: Trade[],
): Discipline {
  const ev = evaluateAccount(rules, startingBalance, trades);
  const dayPnl = pnlByDay(trades);
  const breaker = consistencyBreakerDay(dayPnl, ev.consistency?.state);

  const days: DisciplineDay[] = [];
  let disciplinedDays = 0;
  let breached = 0;
  let approached = 0;
  let overSized = 0;

  for (const [date, pnl] of dayPnl) {
    const flag = dailyLossFlag(pnl, rules.dailyLossLimit ?? null);
    const isOverSized = date === breaker;

    if (flag === 'breached') breached++;
    else if (flag === 'approached') approached++;
    if (isOverSized) overSized++;

    const disciplined = flag === 'none' && !isOverSized;
    if (disciplined) disciplinedDays++;

    days.push({ date, dailyLoss: flag, overSized: isOverSized, disciplined });
  }

  const tradingDays = dayPnl.size;
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    tradingDays,
    disciplinedDays,
    score: tradingDays === 0 ? null : Math.round((disciplinedDays / tradingDays) * 100),
    breached,
    approached,
    overSized,
    days,
  };
}
