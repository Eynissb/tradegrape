import { evaluateAccount, pnlByDay } from '../rules/futures-engine';
import type { OfferRules, RuleState, Trade } from '../rules/types';

/**
 * Insights post-saisie — ce que le journal DIT au trader après une entrée.
 *
 * Aucune règle n'est recalculée ici : tout provient de `evaluateAccount` et de
 * `pnlByDay`. Ce module ne fait qu'interpréter et hiérarchiser ce que le moteur
 * a déjà établi. Fonctions pures, sans réseau ni DB (CLAUDE.md §8).
 */

export type InsightTone = 'danger' | 'warn' | 'ok' | 'info';

export interface Insight {
  /** Identifiant stable — sert de clé de rendu et de repère de test. */
  key: string;
  tone: InsightTone;
  message: string;
}

const TONE_RANK: Record<InsightTone, number> = { danger: 0, warn: 1, ok: 2, info: 3 };

/**
 * Jour responsable de la rupture de cohérence : le jour GAGNANT le plus lourd.
 * Définition unique, partagée avec le calendrier — elle vivait en double.
 */
export function consistencyBreakerDay(
  dayPnl: Map<string, number>,
  consistencyState: RuleState | null | undefined,
): string | null {
  if (consistencyState !== 'warning') return null;
  let best = 0;
  let day: string | null = null;
  for (const [d, pnl] of dayPnl) {
    if (pnl > best) {
      best = pnl;
      day = d;
    }
  }
  return day;
}

/** Nombre de jours consécutifs de même signe se terminant à `day` (0 si nul). */
export function streakEndingAt(dayPnl: Map<string, number>, day: string): { length: number; winning: boolean } {
  const days = [...dayPnl.keys()].filter((d) => d <= day).sort();
  const last = days.at(-1);
  if (!last || last !== day) return { length: 0, winning: false };

  const sign = Math.sign(dayPnl.get(day) ?? 0);
  if (sign === 0) return { length: 0, winning: false };

  let length = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (Math.sign(dayPnl.get(days[i]) ?? 0) !== sign) break;
    length++;
  }
  return { length, winning: sign > 0 };
}

function fmt(value: number, currency: string): string {
  return `${Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Construit les messages contextuels d'un jour donné, du plus grave au plus
 * anodin. `limit` borne la sortie : au-delà de trois messages, l'utilisateur
 * ne lit plus rien.
 */
export function buildInsights(params: {
  rules: OfferRules;
  startingBalance: number;
  allTrades: Trade[];
  /** Jour concerné (celui qui vient d'être saisi), au format YYYY-MM-DD. */
  day: string;
  currency: string;
  limit?: number;
}): Insight[] {
  const { rules, startingBalance, allTrades, day, currency, limit = 3 } = params;

  const ev = evaluateAccount(rules, startingBalance, allTrades);
  const dayPnl = pnlByDay(allTrades);
  const pnl = dayPnl.get(day);
  if (pnl === undefined) return [];

  const out: Insight[] = [];

  /* — Le compte est hors des règles : rien d'autre ne compte. — */
  if (ev.status === 'failed') {
    out.push({
      key: 'failed',
      tone: 'danger',
      message: 'Ce compte est hors des règles. Les jauges ci-dessus détaillent la règle franchie.',
    });
  }

  /* — Perte journalière : le jour lui-même, pas l'état courant du compte. — */
  const dailyLimit = rules.dailyLossLimit;
  if (dailyLimit && dailyLimit > 0 && pnl < 0) {
    const used = Math.abs(pnl);
    const ratio = used / dailyLimit;
    if (ratio >= 1) {
      out.push({
        key: 'daily-loss-breached',
        tone: 'danger',
        message: `Ce jour a dépassé ta perte journalière maximale : ${fmt(used, currency)} pour une limite de ${fmt(dailyLimit, currency)}.`,
      });
    } else if (ratio >= 0.8) {
      out.push({
        key: 'daily-loss-approached',
        tone: 'warn',
        message: `Ce jour a approché ta perte journalière maximale : ${fmt(used, currency)} sur ${fmt(dailyLimit, currency)}, soit ${Math.round(ratio * 100)} %.`,
      });
    }
  }

  /* — Cohérence : ce jour est-il celui qui bloque la règle ? — */
  const breaker = consistencyBreakerDay(dayPnl, ev.consistency?.state);
  if (breaker === day && ev.consistency) {
    out.push({
      key: 'consistency-breaker',
      tone: 'warn',
      message: `C'est ce jour qui casse ta cohérence : il pèse ${ev.consistency.value} % du profit total, pour un maximum de ${ev.consistency.limit} %.`,
    });
  }

  /* — Objectif atteint. — */
  if (ev.profitTarget?.state === 'passed') {
    out.push({
      key: 'target-passed',
      tone: 'ok',
      message: `Objectif de profit atteint : ${fmt(ev.profitTarget.value, currency)} sur ${fmt(ev.profitTarget.limit, currency)} requis.`,
    });
  }

  /* — Série en cours. — */
  const streak = streakEndingAt(dayPnl, day);
  if (streak.length >= 3) {
    out.push({
      key: streak.winning ? 'streak-win' : 'streak-loss',
      tone: streak.winning ? 'ok' : 'warn',
      message: streak.winning
        ? `${streak.length}e jour gagnant d'affilée.`
        : `${streak.length}e jour perdant d'affilée — c'est souvent là qu'on force.`,
    });
  }

  /* — Marge restante avant le plancher : l'information de survie. — */
  if (ev.status !== 'failed') {
    const room = ev.drawdown.value;
    out.push({
      key: 'drawdown-room',
      tone: ev.drawdown.state === 'ok' ? 'info' : 'warn',
      message: `Il te reste ${fmt(room, currency)} de marge avant le plancher de drawdown (${fmt(ev.drawdownFloor, currency)}).`,
    });
  }

  return out.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]).slice(0, limit);
}
