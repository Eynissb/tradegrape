/**
 * Validation de la collecte AVANT toute écriture. Module pur.
 *
 * On refuse ce qui produirait une donnée fausse en base plutôt que de laisser
 * Postgres trancher : un `price = 0` involontaire ou un `consistency_pct` saisi
 * sur une firm dont le moteur calcule la cohérence autrement ne lèverait aucune
 * erreur SQL — il afficherait simplement une jauge mensongère.
 */

import type { FirmSeed, OfferInput, OfferSeed, PlanSeed } from './types';

const DRAWDOWN = new Set(['EOD', 'TRAIL', 'STATIC']);
const PAYOUT_MODELS = new Set([
  'fixed_cap', 'pct_profit', 'progressive', 'buffer_then_free', 'unlimited',
]);
const STANCES = new Set(['allowed', 'restricted', 'forbidden', 'monitored']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface SeedIssue {
  level: 'error' | 'warning';
  where: string;
  message: string;
}

/** Offre effective = defaults du plan + valeurs de l'offre. */
export function resolveOffer(plan: PlanSeed, offer: OfferInput): OfferSeed {
  return { ...(plan.offerDefaults ?? {}), ...offer } as OfferSeed;
}

/**
 * Champs dont l'incertitude NE BLOQUE PAS la vérification.
 *
 * Critère unique : **ce champ peut-il faire échouer un compte ?**
 *  - Commerciaux — un prix introuvable ne dit rien de la justesse du drawdown.
 *  - Limites de contrats — elles bornent la taille de position, elles ne
 *    décident jamais de la survie du compte ; le moteur ne les lit même pas.
 *
 * Sans cette distinction, la file `where reviewed_at is null` confondrait
 * « limite de contrats inconnue » et « drawdown incertain », et perdrait son
 * tranchant : on ne saurait plus quoi revérifier en priorité.
 *
 * Liste volontairement NÉGATIVE : un champ non listé bloque par défaut. Sur un
 * outil de gestion du risque, une incertitude non classée doit coûter.
 */
const NON_BLOCKING_FIELDS = new Set([
  // Commercial
  'price', 'price_regular', 'activation_fee', 'is_recurring',
  // Taille de position — jamais une cause d'échec
  'max_minis', 'max_micros', 'funded_max_minis', 'funded_max_micros',
]);

/** Champs incertains qui peuvent réellement faire échouer un compte. */
export function blockingUnverifiedFields(offer: OfferSeed): string[] {
  return (offer.unverifiedFields ?? []).filter((f) => !NON_BLOCKING_FIELDS.has(f));
}

/**
 * `reviewed_at` d'une offre : la date de collecte si les règles qui décident de
 * la survie du compte sont vérifiées, sinon `null`. Une offre dont un champ
 * bloquant reste douteux doit rester dans la file de revérification.
 */
export function reviewedAtFor(firm: FirmSeed, offer: OfferSeed): string | null {
  if (offer.confidence !== 'verified') return null;
  if (blockingUnverifiedFields(offer).length > 0) return null;
  return firm.collectedAt;
}

function checkOffer(
  firm: FirmSeed,
  plan: PlanSeed,
  raw: OfferInput,
  seenSizes: Set<number>,
  knownPlatforms: Set<string>,
  issues: SeedIssue[],
): void {
  const o = resolveOffer(plan, raw);
  const where = `${firm.slug}/${plan.slug}/${raw.account_size}`;

  if (!Number.isFinite(o.account_size) || o.account_size <= 0) {
    issues.push({ level: 'error', where, message: 'account_size invalide.' });
  }
  if (seenSizes.has(o.account_size)) {
    issues.push({
      level: 'error',
      where,
      message: `taille dupliquée dans le plan — viole unique(plan_id, account_size).`,
    });
  }
  seenSizes.add(o.account_size);

  // Le piège que la migration 0014 vient d'écarter : 0 se lirait « gratuit ».
  if (o.price === 0) {
    issues.push({
      level: 'error',
      where,
      message: 'price = 0 : utilise `null` pour « prix inconnu », 0 signifie gratuit.',
    });
  }
  if (o.price === undefined || o.price === null) {
    issues.push({ level: 'warning', where, message: 'prix inconnu (null).' });
  }

  if (!DRAWDOWN.has(o.drawdown_type)) {
    issues.push({ level: 'error', where, message: `drawdown_type « ${o.drawdown_type} » invalide.` });
  }
  if (o.funded_drawdown_type && !DRAWDOWN.has(o.funded_drawdown_type)) {
    issues.push({ level: 'error', where, message: `funded_drawdown_type « ${o.funded_drawdown_type} » invalide.` });
  }
  if (!Number.isFinite(o.drawdown_amount) || o.drawdown_amount <= 0) {
    issues.push({ level: 'error', where, message: 'drawdown_amount requis (> 0).' });
  }
  if (o.payout_model && !PAYOUT_MODELS.has(o.payout_model)) {
    issues.push({ level: 'error', where, message: `payout_model « ${o.payout_model} » invalide.` });
  }

  for (const pct of ['consistency_pct', 'funded_consistency_pct', 'profit_split'] as const) {
    const v = o[pct];
    if (v != null && (v < 0 || v > 100)) {
      issues.push({ level: 'error', where, message: `${pct} hors [0,100] : ${v}.` });
    }
  }

  for (const slug of o.platforms ?? []) {
    if (!knownPlatforms.has(slug)) {
      issues.push({
        level: 'error',
        where,
        message: `plateforme « ${slug} » absente du catalogue.`,
      });
    }
  }

  // Un drawdown funded différent DOIT être explicite : c'est le mécanisme qui
  // fait perdre le plus de comptes financés (cf. lib/rules/phase.ts).
  if (o.funded_drawdown_type && o.funded_drawdown_type !== o.drawdown_type && o.confidence !== 'verified') {
    issues.push({
      level: 'warning',
      where,
      message: `drawdown durci en financé (${o.drawdown_type}→${o.funded_drawdown_type}) sur une offre non vérifiée.`,
    });
  }
}

export function validateFirm(
  firm: FirmSeed,
  knownPlatforms: Set<string>,
  seenFirmSlugs: Set<string>,
): SeedIssue[] {
  const issues: SeedIssue[] = [];
  const where = firm.slug;

  if (!SLUG_RE.test(firm.slug)) {
    issues.push({ level: 'error', where, message: 'slug de firm invalide (kebab-case attendu).' });
  }
  if (seenFirmSlugs.has(firm.slug)) {
    issues.push({ level: 'error', where, message: 'slug de firm dupliqué.' });
  }
  seenFirmSlugs.add(firm.slug);

  if (!DATE_RE.test(firm.collectedAt)) {
    issues.push({ level: 'error', where, message: 'collectedAt attendu en AAAA-MM-JJ.' });
  }
  if (firm.health_score != null && (firm.health_score < 0 || firm.health_score > 100)) {
    issues.push({ level: 'error', where, message: 'health_score hors [0,100].' });
  }

  for (const r of firm.styleRules ?? []) {
    if (!STANCES.has(r.stance)) {
      issues.push({ level: 'error', where: `${where}/style/${r.rule_key}`, message: `stance « ${r.stance} » invalide.` });
    }
  }
  for (const p of firm.platforms ?? []) {
    if (!knownPlatforms.has(p.slug)) {
      issues.push({ level: 'error', where: `${where}/platforms`, message: `plateforme « ${p.slug} » absente du catalogue.` });
    }
  }

  if (firm.plans.length === 0) {
    issues.push({ level: 'warning', where, message: 'aucun plan.' });
  }

  const seenPlanSlugs = new Set<string>();
  for (const plan of firm.plans) {
    const pw = `${firm.slug}/${plan.slug}`;
    if (!SLUG_RE.test(plan.slug)) {
      issues.push({ level: 'error', where: pw, message: 'slug de plan invalide.' });
    }
    if (seenPlanSlugs.has(plan.slug)) {
      issues.push({ level: 'error', where: pw, message: 'slug de plan dupliqué — viole unique(firm_id, slug).' });
    }
    seenPlanSlugs.add(plan.slug);

    if (plan.offers.length === 0) {
      issues.push({ level: 'warning', where: pw, message: 'plan sans offre.' });
    }

    const sizes = new Set<number>();
    for (const offer of plan.offers) {
      checkOffer(firm, plan, offer, sizes, knownPlatforms, issues);
    }

    // Deux lignes de plafond ne peuvent pas se disputer le même (variante, cycle).
    const capKeys = new Set<string>();
    for (const cap of plan.payoutCaps ?? []) {
      const key = `${cap.variant ?? ''}#${cap.cycle_from ?? 1}`;
      if (capKeys.has(key)) {
        issues.push({ level: 'error', where: `${pw}/caps`, message: `plafond dupliqué pour (${cap.variant ?? 'unique'}, cycle ${cap.cycle_from ?? 1}).` });
      }
      capKeys.add(key);
    }
  }

  return issues;
}

export function validateAll(firms: FirmSeed[], platformSlugs: string[]): SeedIssue[] {
  const known = new Set(platformSlugs);
  const seen = new Set<string>();
  return firms.flatMap((f) => validateFirm(f, known, seen));
}
