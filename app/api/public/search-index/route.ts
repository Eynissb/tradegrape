import { createClient } from '@/lib/supabase/server';
import { loadPublicCatalog } from '@/lib/catalog/query';
import { valueOf, type PublicOffer } from '@/lib/catalog/public-offer';

/**
 * Index de recherche du header : firms ayant au moins une offre PUBLIÉE et
 * VÉRIFIÉE. Les brouillons et non-publiées sont déjà écartés par la RLS
 * (`is_published or is_staff()`) — donc Alpha Futures (non publiée) n'apparaît
 * jamais ; le filtre `trust.verified` retire en plus les offres `reviewed_at`
 * NULL.
 *
 * Chaque firm porte une offre REPRÉSENTATIVE — la moins chère en prix TTC (le
 * point d'entrée du trader) — d'où l'on tire le nom du plan et le prix affichés
 * dans la liste. Le logo vient de `firms.logo_url` (RLS : l'anon ne voit que les
 * firms publiées). Un résultat mène au comparateur filtré sur la firm.
 */
export const revalidate = 3600;

interface SearchFirm {
  name: string;
  slug: string;
  logo: string | null;
  /** Plan de l'offre la moins chère — un aperçu, pas la liste complète. */
  plan: string | null;
  /** Prix TTC (prix + activation) de cette offre, si la firm le publie. */
  priceTtc: number | null;
  currency: string;
  /** Meilleure note de plan de la firm (pour l'anneau de note). */
  rating: number | null;
  /** Code pays ISO (drapeau) et année de création (années d'activité). */
  country: string | null;
  foundedYear: number | null;
}

/** L'offre `b` est-elle un meilleur représentant que `a` (déjà retenu) ? */
function isBetter(b: PublicOffer, a: PublicOffer | undefined): boolean {
  if (!a) return true;
  const pb = valueOf(b.totalPrice);
  const pa = valueOf(a.totalPrice);
  // Un prix connu prime sur un prix inconnu.
  if (pb !== null && pa === null) return true;
  if (pb === null && pa !== null) return false;
  // Deux prix connus : le moins cher gagne.
  if (pb !== null && pa !== null) return pb < pa;
  // Deux prix inconnus : la plus petite taille sert de point d'entrée.
  return b.size < a.size;
}

export async function GET() {
  const supabase = await createClient();

  const [{ offers }, { data: firmRows }] = await Promise.all([
    loadPublicCatalog(),
    supabase.from('firms').select('slug, logo_url').returns<{ slug: string; logo_url: string | null }[]>(),
  ]);

  const logoBySlug = new Map((firmRows ?? []).map((f) => [f.slug, f.logo_url]));

  const rep = new Map<string, PublicOffer>();
  const bestRating = new Map<string, number>();
  for (const o of offers) {
    if (!o.trust.verified) continue; // jamais les non-vérifiées
    if (o.plan.rating != null) {
      const cur = bestRating.get(o.firm.slug);
      if (cur == null || o.plan.rating > cur) bestRating.set(o.firm.slug, o.plan.rating);
    }
    if (isBetter(o, rep.get(o.firm.slug))) rep.set(o.firm.slug, o);
  }

  const firms: SearchFirm[] = [...rep.values()]
    .map((o) => ({
      name: o.firm.name,
      slug: o.firm.slug,
      logo: logoBySlug.get(o.firm.slug) ?? null,
      plan: o.plan.name,
      priceTtc: valueOf(o.totalPrice),
      currency: o.currency,
      rating: bestRating.get(o.firm.slug) ?? null,
      country: o.firm.country,
      foundedYear: o.firm.foundedYear,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ firms });
}
