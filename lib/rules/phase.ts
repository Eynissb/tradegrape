/**
 * Résolution des règles selon la phase du compte.
 *
 * Le moteur est volontairement aveugle à l'état du compte : il évalue UN jeu de
 * règles. C'est ici qu'on choisit lequel. Plusieurs firms durcissent les règles
 * au passage en financé — Take Profit Trader passe d'EOD à trailing intraday,
 * TradeDay QuickPay force le trailing même quand l'évaluation a été passée en
 * EOD. Sans cette résolution, les jauges d'un compte financé affichent un
 * plancher plus bas que la réalité : on sous-estime le risque exactement là où
 * il est le plus élevé.
 *
 * Module pur : ni réseau, ni DB.
 */

import type { OfferRules } from './types';

export type AccountPhase = 'evaluation' | 'funded';

/**
 * Phase effective d'un compte à partir de son statut.
 * Seul `funded` bascule sur les règles durcies : `passed` désigne une évaluation
 * réussie mais pas encore financée, `failed`/`archived` sont des états terminaux
 * qu'on lit avec les règles sous lesquelles le compte a vécu.
 */
export function phaseOfStatus(status: string | null | undefined): AccountPhase {
  return status === 'funded' ? 'funded' : 'evaluation';
}

/**
 * Règles effectives pour une phase. En évaluation, les règles d'origine sont
 * renvoyées telles quelles. En financé, chaque variante renseignée écrase son
 * équivalent d'évaluation ; une variante absente ou `null` signifie « identique ».
 */
export function rulesForPhase(rules: OfferRules, phase: AccountPhase): OfferRules {
  if (phase !== 'funded') return rules;

  const drawdownType = rules.fundedDrawdownType ?? rules.drawdownType;
  const drawdownAmount =
    rules.fundedDrawdownAmount != null ? rules.fundedDrawdownAmount : rules.drawdownAmount;
  const dailyLossLimit =
    rules.fundedDailyLossLimit != null ? rules.fundedDailyLossLimit : rules.dailyLossLimit;

  // Rien ne change : on renvoie l'objet d'origine (évite une allocation et
  // garde l'égalité référentielle pour les comparaisons côté appelant).
  if (
    drawdownType === rules.drawdownType &&
    drawdownAmount === rules.drawdownAmount &&
    dailyLossLimit === rules.dailyLossLimit
  ) {
    return rules;
  }

  return { ...rules, drawdownType, drawdownAmount, dailyLossLimit };
}

/** Raccourci : règles effectives directement depuis le statut du compte. */
export function rulesForStatus(rules: OfferRules, status: string | null | undefined): OfferRules {
  return rulesForPhase(rules, phaseOfStatus(status));
}

/**
 * Vrai si la phase financée durcit réellement les règles — sert à prévenir
 * l'utilisateur AVANT qu'il passe financé (« ton drawdown deviendra trailing »).
 */
export function fundedRulesDiffer(rules: OfferRules): boolean {
  return rulesForPhase(rules, 'funded') !== rules;
}
