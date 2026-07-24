import { createClient } from '@/lib/supabase/server';
import {
  toPublicOffer,
  type PublicOffer,
  type PublicOfferRow,
  type RuleStance,
} from './public-offer';

/**
 * Lecture publique du catalogue pour le comparateur.
 *
 * Les jointures sont en `!inner` : une offre publiée sous un plan ou une firm
 * en brouillon ne doit PAS apparaître. Les RLS le garantissent déjà côté
 * Postgres (`is_published or is_staff()` sur les trois tables), mais l'`!inner`
 * l'exprime dans la requête — et évite des lignes orphelines si une policy
 * changeait.
 */
const OFFER_SELECT = `
  id, account_size, currency,
  price, price_regular, activation_fee, is_recurring,
  drawdown_type, drawdown_amount, drawdown_locks_at_breakeven,
  profit_target, daily_loss_limit, consistency_pct, min_trading_days,
  funded_drawdown_type, funded_drawdown_amount, funded_daily_loss, funded_consistency_pct,
  profit_split, payout_model, payout_buffer, payout_min_amount,
  payout_frequency_days, payout_min_days, payout_method,
  platforms, reviewed_at,
  plan:plans!inner ( slug, name, account_kind, rating, firm:firms!inner ( slug, name, health_score ) ),
  payout_caps:offer_payout_caps (
    cycle_from, cycle_to, max_amount, max_pct, variant, split_pct, consistency_pct, min_profit_days
  )
`;

/** PostgREST rend les relations imbriquées tantôt en objet, tantôt en tableau. */
const one = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

interface RawOffer {
  id: string;
  platforms: string[] | null;
  plan: unknown;
  [k: string]: unknown;
}

export interface CatalogSnapshot {
  offers: PublicOffer[];
  /** Slugs → noms lisibles, pour la colonne Plateforme. */
  platformNames: Record<string, string>;
  /** Horodatage de génération, affiché en pied de page (transparence). */
  generatedAt: string;
}

export async function loadPublicCatalog(): Promise<CatalogSnapshot> {
  const supabase = await createClient();

  const [{ data: offerRows }, { data: platformRows }, { data: promoRows }, { data: newsRows }] =
    await Promise.all([
    supabase.from('offers').select(OFFER_SELECT).eq('is_published', true).returns<RawOffer[]>(),
    supabase.from('platforms').select('slug, name').returns<{ slug: string; name: string }[]>(),
    /* Une seule promo par firm : la plus avantageuse. `is_active` est déjà filtré
       par la RLS `promos public`, mais on l'exprime aussi ici. */
    supabase
      .from('promo_codes')
      .select('firm_id, code, discount_pct, ends_at, is_exclusive, firm:firms!inner ( slug )')
      .eq('is_active', true)
      .order('discount_pct', { ascending: false, nullsFirst: false })
      .returns<{ code: string; discount_pct: number | null; ends_at: string | null; firm: unknown }[]>(),
    /* Posture « news » de chaque firm, pour la colonne du même nom en phase
       financée. Une seule règle nous intéresse ici : le reste des styles vit
       dans les guides. */
    supabase
      .from('firm_style_rules')
      .select('stance, threshold_note, detail, firm:firms!inner ( slug )')
      .eq('rule_key', 'news')
      .returns<{ stance: RuleStance; threshold_note: string | null; detail: string | null; firm: unknown }[]>(),
  ]);

  const newsByFirm = new Map<string, { stance: RuleStance; note: string | null }>();
  for (const r of newsRows ?? []) {
    const firm = one<{ slug: string }>(r.firm as never);
    if (firm) newsByFirm.set(firm.slug, { stance: r.stance, note: r.threshold_note ?? r.detail });
  }

  const promoByFirm = new Map<string, { code: string; discount_pct: number | null; ends_at: string | null }>();
  for (const p of promoRows ?? []) {
    const firm = one<{ slug: string }>(p.firm as never);
    if (!firm) continue;
    // `order` place la meilleure remise en tête : on ne garde que la première.
    if (!promoByFirm.has(firm.slug)) {
      promoByFirm.set(firm.slug, { code: p.code, discount_pct: p.discount_pct, ends_at: p.ends_at });
    }
  }

  const offers: PublicOffer[] = [];
  for (const raw of offerRows ?? []) {
    const plan = one<{ slug: string; name: string; account_kind: string; rating: number | null; firm: unknown }>(
      raw.plan as never,
    );
    const firm = plan ? one<{ slug: string; name: string; health_score: number | null }>(plan.firm as never) : null;
    // Sans plan ou sans firm visible, l'offre n'est pas publiable : on l'ignore.
    if (!plan || !firm) continue;

    const row = {
      ...(raw as unknown as PublicOfferRow),
      plan: { slug: plan.slug, name: plan.name, account_kind: plan.account_kind, rating: plan.rating },
      firm: { slug: firm.slug, name: firm.name, health_score: firm.health_score },
      promo: promoByFirm.get(firm.slug) ?? null,
      news_stance: newsByFirm.get(firm.slug)?.stance ?? null,
      news_note: newsByFirm.get(firm.slug)?.note ?? null,
    } satisfies PublicOfferRow;

    offers.push(toPublicOffer(row));
  }

  return {
    offers,
    platformNames: Object.fromEntries((platformRows ?? []).map((p) => [p.slug, p.name])),
    generatedAt: new Date().toISOString(),
  };
}
