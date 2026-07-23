import type { RuleEvaluation } from '../rules/types';

/**
 * Synthèse de validation d'un challenge en ÉVALUATION — ce que la carte
 * accentuée affiche quand le compte n'est pas encore financé. Elle agrège ce
 * que les jauges détaillent, elle ne le répète pas : les blocs de règles
 * disent *où en est chaque règle*, cette synthèse dit *ce qu'il reste à faire
 * pour franchir l'étape*.
 *
 * Aucun calcul de règle réimplémenté : tout vient de `evaluateAccount`.
 *
 * Note : modèle mono-étape. Les challenges multi-phases (phase 1 / phase 2,
 * exhibition FFN, Qualification→Master→Funded de Bulenox) ne sont pas encore
 * modélisés — item « phase intermédiaire » du §12. Quand ils le seront, le
 * libellé et le calcul suivront la phase courante.
 */

export type ValidationState = 'failed' | 'validated' | 'in_progress';

export interface ValidationSummary {
  state: ValidationState;
  /** Clés i18n des règles qui font PERDRE le compte (state === 'failed'). */
  failedReasons: string[];
  /** Ce qu'il manque pour valider (state === 'in_progress'). */
  missing: {
    /** Profit restant vers l'objectif (0 si atteint ou pas d'objectif). */
    profit: number;
    /** Jours de trading restants (0 si le minimum est atteint). */
    tradingDays: number;
    /** La cohérence bloque-t-elle encore la validation ? */
    consistency: boolean;
  };
}

/** Règles dont la violation fait PERDRE le compte (pas seulement bloquer). */
const HARD_FAILURES = new Set(['daily_loss_breached', 'drawdown_breached']);

export function buildValidationSummary(ev: RuleEvaluation): ValidationSummary {
  const empty = { profit: 0, tradingDays: 0, consistency: false };

  if (ev.status === 'failed') {
    return {
      state: 'failed',
      failedReasons: ev.reasons.filter((r) => HARD_FAILURES.has(r)),
      missing: empty,
    };
  }

  if (ev.canPass) {
    return { state: 'validated', failedReasons: [], missing: empty };
  }

  return {
    state: 'in_progress',
    failedReasons: [],
    missing: {
      profit:
        ev.profitTarget && ev.profitTarget.ratio < 1
          ? round2(ev.profitTarget.limit - ev.profitTarget.value)
          : 0,
      tradingDays: ev.tradingDays.met ? 0 : ev.tradingDays.required - ev.tradingDays.count,
      consistency: ev.consistency != null && ev.consistency.state !== 'ok',
    },
  };
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
