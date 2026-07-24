/**
 * Chiffres de la page d'accueil, dérivés du catalogue PUBLIÉ. Module PUR.
 *
 * Raison d'être : la home des concurrents affiche des chiffres codés en dur
 * (« 13 guides dès 51,35 $ ») qui périment sans prévenir. Ici tout est calculé
 * à partir des offres réellement publiées — si rien n'est publié, le chiffre est
 * `null` et l'écran le dit, il n'invente pas.
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

export interface HomeStats {
  /** Nombre de firms distinctes dans le catalogue publié. */
  firmCount: number;
  /** Nombre d'offres comparables (publiées). */
  offerCount: number;
  /** L'offre au plus bas prix TTC connu, ou `null` si aucun prix n'est publié. */
  cheapest: CheapestOffer | null;
}

export function buildHomeStats(offers: PublicOffer[]): HomeStats {
  const firmCount = new Set(offers.map((o) => o.firm.slug)).size;

  /* « Le moins cher » se calcule sur le prix TTC CONNU. Une offre sans prix ne
     peut pas être « la moins chère » — l'inclure à 0 serait le mensonge que le
     produit refuse. */
  let cheapest: CheapestOffer | null = null;
  for (const o of offers) {
    if (!o.totalPrice.known) continue;
    if (cheapest === null || o.totalPrice.value < cheapest.totalPrice) {
      cheapest = {
        totalPrice: o.totalPrice.value,
        currency: o.currency,
        firmName: o.firm.name,
        firmSlug: o.firm.slug,
        planName: o.plan.name,
        size: o.size,
      };
    }
  }

  return { firmCount, offerCount: offers.length, cheapest };
}
