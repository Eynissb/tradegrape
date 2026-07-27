import { loadPublicCatalog } from '@/lib/catalog/query';

/**
 * Index de recherche du header : firms ayant au moins une offre PUBLIÉE et
 * VÉRIFIÉE. Les brouillons et non-publiées sont déjà écartés par la RLS
 * (`is_published or is_staff()`) — donc Alpha Futures (non publiée) n'apparaît
 * jamais ; le filtre `trust.verified` retire en plus les offres `reviewed_at`
 * NULL. On ne renvoie que le strict nécessaire à la recherche.
 */
export const revalidate = 3600;

export async function GET() {
  const { offers } = await loadPublicCatalog();

  const byFirm = new Map<string, { name: string; slug: string; sizes: number[] }>();
  for (const o of offers) {
    if (!o.trust.verified) continue; // jamais les non-vérifiées
    const e = byFirm.get(o.firm.slug) ?? { name: o.firm.name, slug: o.firm.slug, sizes: [] };
    if (!e.sizes.includes(o.size)) e.sizes.push(o.size);
    byFirm.set(o.firm.slug, e);
  }

  const firms = [...byFirm.values()]
    .map((f) => ({ ...f, sizes: f.sizes.sort((a, b) => a - b) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ firms });
}
