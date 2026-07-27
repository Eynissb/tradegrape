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
  max_minis, max_micros, funded_max_minis, funded_max_micros,
  funded_drawdown_type, funded_drawdown_amount, funded_daily_loss, funded_consistency_pct,
  profit_split, payout_model, payout_buffer, payout_min_amount,
  payout_frequency_days, payout_min_days, payout_method,
  platforms, reviewed_at,
  plan:plans!inner ( slug, name, account_kind, rating,
    firm:firms!inner ( slug, name, health_score, logo_url, country, founded_year, max_funded_accounts ) ),
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

  const [
    { data: offerRows },
    { data: platformRows },
    { data: promoRows },
    { data: styleRows },
    { data: licenseRows },
  ] = await Promise.all([
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
    /* Postures de style par firm : `news` (colonne en phase financée) ET
       `scalping` (sous-carte du déplié). Le reste des styles vit dans les guides. */
    supabase
      .from('firm_style_rules')
      .select('rule_key, stance, threshold_note, detail, firm:firms!inner ( slug )')
      .in('rule_key', ['news', 'scalping'])
      .returns<{ rule_key: string; stance: RuleStance; threshold_note: string | null; detail: string | null; firm: unknown }[]>(),
    /* Licences de plateforme OFFERTES (is_free) : la sous-carte « Licence fournie »
       du déplié. Les slugs se résolvent en noms via `platformNames`. */
    supabase
      .from('firm_platforms')
      .select('is_free, firm:firms!inner ( slug ), platform:platforms!inner ( slug )')
      .eq('is_free', true)
      .returns<{ is_free: boolean; firm: unknown; platform: unknown }[]>(),
  ]);

  const newsByFirm = new Map<string, { stance: RuleStance; note: string | null }>();
  const scalpByFirm = new Map<string, { stance: RuleStance; note: string | null }>();
  for (const r of styleRows ?? []) {
    const firm = one<{ slug: string }>(r.firm as never);
    if (!firm) continue;
    const entry = { stance: r.stance, note: r.threshold_note ?? r.detail };
    if (r.rule_key === 'news') newsByFirm.set(firm.slug, entry);
    else if (r.rule_key === 'scalping') scalpByFirm.set(firm.slug, entry);
  }

  const licsByFirm = new Map<string, string[]>();
  for (const r of licenseRows ?? []) {
    const firm = one<{ slug: string }>(r.firm as never);
    const platform = one<{ slug: string }>(r.platform as never);
    if (!firm || !platform) continue;
    const cur = licsByFirm.get(firm.slug) ?? [];
    if (!cur.includes(platform.slug)) cur.push(platform.slug);
    licsByFirm.set(firm.slug, cur);
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
    const firm = plan
      ? one<{
          slug: string;
          name: string;
          health_score: number | null;
          logo_url: string | null;
          country: string | null;
          founded_year: number | null;
          max_funded_accounts: number | null;
        }>(plan.firm as never)
      : null;
    // Sans plan ou sans firm visible, l'offre n'est pas publiable : on l'ignore.
    if (!plan || !firm) continue;

    const scalp = scalpByFirm.get(firm.slug);
    const row = {
      ...(raw as unknown as PublicOfferRow),
      plan: { slug: plan.slug, name: plan.name, account_kind: plan.account_kind, rating: plan.rating },
      firm: {
        slug: firm.slug,
        name: firm.name,
        health_score: firm.health_score,
        logo_url: firm.logo_url,
        country: firm.country,
        founded_year: firm.founded_year,
        max_funded_accounts: firm.max_funded_accounts,
      },
      promo: promoByFirm.get(firm.slug) ?? null,
      news_stance: newsByFirm.get(firm.slug)?.stance ?? null,
      news_note: newsByFirm.get(firm.slug)?.note ?? null,
      scalp_stance: scalp?.stance ?? null,
      scalp_note: scalp?.note ?? null,
      licenses: licsByFirm.get(firm.slug) ?? [],
    } satisfies PublicOfferRow;

    offers.push(toPublicOffer(row));
  }

  return {
    offers,
    platformNames: Object.fromEntries((platformRows ?? []).map((p) => [p.slug, p.name])),
    generatedAt: new Date().toISOString(),
  };
}
