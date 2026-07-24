/**
 * Chiffres et facettes de la page d'accueil, dérivés du catalogue PUBLIÉ.
 * Module PUR.
 *
 * Raison d'être : la home des concurrents affiche des chiffres codés en dur
 * (« 13 guides dès 51,35 $ ») qui périment sans prévenir. Ici tout est calculé
 * à partir des offres réellement publiées — si rien n'est publié, le chiffre est
 * `null`/vide et l'écran le dit, il n'invente pas.
 */

import type { PublicOffer } from './public-offer';

export interface CheapestOffer {
  totalPrice: number;
  currency: string;
  firmName: string;
  firmSlug: string;
  planName: string;
  size: number;
}

/** Une firm dans le bandeau : nom, prix d'entrée réel, promo si elle en a une. */
export interface FirmEntry {
  slug: string;
  name: string;
  healthScore: number | null;
  /** Plus bas prix TTC CONNU parmi les offres de la firm, ou `null`. */
  entryPrice: number | null;
  currency: string;
  offerCount: number;
  /** Promo de la firm — signalée comme promo, jamais fondue dans le prix. */
  promo: { code: string; discountPct: number | null; permanent: boolean } | null;
}

export interface HomeStats {
  /** Nombre de firms distinctes dans le catalogue publié. */
  firmCount: number;
  /** Nombre d'offres comparables (publiées). */
  offerCount: number;
  /** L'offre au plus bas prix TTC connu, ou `null` si aucun prix n'est publié. */
  cheapest: CheapestOffer | null;
  /** Firms du bandeau, prix d'entrée croissant (prix inconnu en dernier). */
  firms: FirmEntry[];
  /** Noms des firms proposant au moins une offre SANS règle de cohérence (éval). */
  noConsistencyFirms: string[];
  /** Noms des firms facturant des frais d'activation (>0) — les « frais cachés ». */
  activationFirms: string[];
  /** Nombre d'offres dont le drawdown d'évaluation est en trailing. */
  trailCount: number;
  /** Nombre d'offres qui durcissent leurs règles une fois financées. */
  fundedHardeningCount: number;
}

/** Prix d'entrée croissant, prix inconnu en dernier, puis ordre alphabétique. */
function byEntryPrice(a: FirmEntry, b: FirmEntry): number {
  if (a.entryPrice === null && b.entryPrice === null) return a.name.localeCompare(b.name);
  if (a.entryPrice === null) return 1;
  if (b.entryPrice === null) return -1;
  return a.entryPrice - b.entryPrice || a.name.localeCompare(b.name);
}

export function buildHomeStats(offers: PublicOffer[]): HomeStats {
  const firmCount = new Set(offers.map((o) => o.firm.slug)).size;

  /* « Le moins cher » se calcule sur le prix TTC CONNU. Une offre sans prix ne
     peut pas être « la moins chère » — l'inclure à 0 serait le mensonge que le
     produit refuse. */
  let cheapest: CheapestOffer | null = null;

  /* Agrégation par firm, en un passage. */
  const byFirm = new Map<string, FirmEntry>();
  const noConsistency = new Set<string>();
  const activation = new Set<string>();
  let trailCount = 0;
  let fundedHardeningCount = 0;

  for (const o of offers) {
    // moins chère (global)
    if (o.totalPrice.known && (cheapest === null || o.totalPrice.value < cheapest.totalPrice)) {
      cheapest = {
        totalPrice: o.totalPrice.value,
        currency: o.currency,
        firmName: o.firm.name,
        firmSlug: o.firm.slug,
        planName: o.plan.name,
        size: o.size,
      };
    }

    // facettes
    if (o.drawdown.type === 'TRAIL') trailCount += 1;
    if (o.fundedHardening.differs) fundedHardeningCount += 1;
    if (!o.hasConsistency) noConsistency.add(o.firm.name);
    if (o.activationFee > 0) activation.add(o.firm.name);

    // agrégat firm
    const cur = byFirm.get(o.firm.slug);
    const entry = o.totalPrice.known ? o.totalPrice.value : null;
    if (!cur) {
      byFirm.set(o.firm.slug, {
        slug: o.firm.slug,
        name: o.firm.name,
        healthScore: o.firm.healthScore,
        entryPrice: entry,
        currency: o.currency,
        offerCount: 1,
        promo: o.trust.promo
          ? {
              code: o.trust.promo.code,
              discountPct: o.trust.promo.discountPct,
              permanent: o.trust.promo.permanent,
            }
          : null,
      });
    } else {
      cur.offerCount += 1;
      if (entry !== null && (cur.entryPrice === null || entry < cur.entryPrice)) {
        cur.entryPrice = entry;
      }
    }
  }

  return {
    firmCount,
    offerCount: offers.length,
    cheapest,
    firms: [...byFirm.values()].sort(byEntryPrice),
    noConsistencyFirms: [...noConsistency].sort((a, b) => a.localeCompare(b)),
    activationFirms: [...activation].sort((a, b) => a.localeCompare(b)),
    trailCount,
    fundedHardeningCount,
  };
}
