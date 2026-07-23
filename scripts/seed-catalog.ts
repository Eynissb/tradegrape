/**
 * Seed du catalogue (firms → plans → offres + tables enfants).
 *
 *   npx tsx scripts/seed-catalog.ts            # DRY-RUN : n'écrit rien
 *   npx tsx scripts/seed-catalog.ts --apply    # écrit réellement
 *
 * Garde-fous :
 *  - dry-run par défaut ; `--apply` est explicite ;
 *  - validation complète AVANT toute écriture, aucune erreur tolérée ;
 *  - upserts sur clés naturelles (slug firm, firm+slug plan, plan+taille offre)
 *    → rejouable après correction, sans doublon ;
 *  - AUCUNE suppression, hors remplacement des lignes enfants d'un plan qu'on
 *    réécrit (plafonds / paliers), qui n'ont pas de clé naturelle stable ;
 *  - périmètre limité aux tables CATALOGUE : jamais le journal ni les données
 *    utilisateur.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { FIRMS } from '@/data/catalog';
import { PLATFORMS, PLATFORM_SLUGS } from '@/data/catalog/platforms';
import { resolveOffer, reviewedAtFor, validateAll } from '@/lib/seed/validate';
import type { FirmSeed, OfferInput } from '@/lib/seed/types';

const APPLY = process.argv.includes('--apply');

/* ------------------------------------------------------------------- env */

function loadEnv(): { url: string; key: string } {
  const raw = readFileSync('.env.local', 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.');
  return { url, key };
}

/* --------------------------------------------------------------- helpers */

const n = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

function offerRow(firm: FirmSeed, planId: string, plan: FirmSeed['plans'][number], raw: OfferInput) {
  const o = resolveOffer(plan, raw);
  return {
    plan_id: planId,
    account_size: o.account_size,
    price: n(o.price),
    price_regular: n(o.price_regular),
    activation_fee: o.activation_fee ?? 0,
    is_recurring: o.is_recurring ?? false,
    currency: o.currency ?? 'USD',
    drawdown_type: o.drawdown_type,
    drawdown_amount: o.drawdown_amount,
    drawdown_locks_at_breakeven: o.drawdown_locks_at_breakeven ?? true,
    profit_target: n(o.profit_target),
    daily_loss_limit: n(o.daily_loss_limit),
    consistency_pct: n(o.consistency_pct),
    min_trading_days: o.min_trading_days ?? 1,
    max_minis: n(o.max_minis),
    max_micros: n(o.max_micros),
    funded_drawdown_type: n(o.funded_drawdown_type),
    funded_daily_loss: n(o.funded_daily_loss),
    funded_consistency_pct: n(o.funded_consistency_pct),
    funded_max_minis: n(o.funded_max_minis),
    funded_max_micros: n(o.funded_max_micros),
    profit_split: n(o.profit_split),
    payout_model: n(o.payout_model),
    payout_buffer: n(o.payout_buffer),
    payout_min_amount: n(o.payout_min_amount),
    payout_frequency_days: n(o.payout_frequency_days),
    payout_min_days: n(o.payout_min_days),
    payout_daily_threshold: n(o.payout_daily_threshold),
    payout_method: n(o.payout_method),
    platforms: o.platforms ?? [],
    reviewed_at: reviewedAtFor(firm, o),
    is_published: false, // jamais publié par le seed : l'humain valide (§10)
  };
}

/* ------------------------------------------------------------------ main */

async function main() {
  /* 1. Validation — rien ne part si quoi que ce soit cloche. */
  const issues = validateAll([...FIRMS], PLATFORM_SLUGS);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  console.log(`\n=== VALIDATION ===`);
  for (const e of errors) console.log(`  ✗ ${e.where} — ${e.message}`);
  if (errors.length === 0) console.log('  aucune erreur.');
  console.log(`  ${warnings.length} avertissement(s).`);
  if (errors.length > 0) {
    console.log('\nAbandon : corrige les erreurs avant d’écrire.\n');
    process.exit(1);
  }

  /* 2. Récapitulatif. */
  let nOffers = 0, nCaps = 0, nSteps = 0, nVerified = 0, nNoPrice = 0;
  for (const f of FIRMS) {
    for (const p of f.plans) {
      nOffers += p.offers.length;
      nCaps += p.payoutCaps?.length ?? 0;
      nSteps += p.scalingSteps?.length ?? 0;
      for (const raw of p.offers) {
        const o = resolveOffer(p, raw);
        if (reviewedAtFor(f, o)) nVerified++;
        if (o.price == null) nNoPrice++;
      }
    }
  }
  const nPlans = FIRMS.reduce((s, f) => s + f.plans.length, 0);

  console.log(`\n=== RÉCAPITULATIF ===`);
  console.log(`  plateformes      ${PLATFORMS.length}`);
  console.log(`  firms            ${FIRMS.length}`);
  console.log(`  plans            ${nPlans}`);
  console.log(`  offres           ${nOffers}   (vérifiées ${nVerified}, à revérifier ${nOffers - nVerified})`);
  console.log(`  prix inconnus    ${nNoPrice}/${nOffers}`);
  console.log(`  plafonds cycle   ${nCaps}`);
  console.log(`  paliers scaling  ${nSteps}`);

  console.log(`\n=== PAR FIRM ===`);
  for (const f of FIRMS) {
    const offers = f.plans.reduce((s, p) => s + p.offers.length, 0);
    console.log(`  ${f.slug.padEnd(24)} ${f.plans.length} plan(s), ${offers} offre(s), collecte ${f.collectedAt}`);
    for (const c of f.engineCaveats ?? []) console.log(`      ⚙  ${c.slice(0, 110)}…`);
    for (const r of f.riskFlags ?? []) console.log(`      ⚠  ${r.slice(0, 110)}`);
  }

  if (!APPLY) {
    console.log(`\n=== DRY-RUN — aucune écriture. Relance avec --apply pour écrire. ===\n`);
    return;
  }

  /* 3. Écriture. */
  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });
  console.log(`\n=== ÉCRITURE ===`);

  const { error: pErr } = await db.from('platforms').upsert(
    PLATFORMS.map((p) => ({ slug: p.slug, name: p.name, is_datafeed: p.is_datafeed ?? false })),
    { onConflict: 'slug' },
  );
  if (pErr) throw new Error(`platforms : ${pErr.message}`);
  const { data: platformRows } = await db.from('platforms').select('id, slug');
  const platformId = new Map((platformRows ?? []).map((p) => [p.slug, p.id]));
  console.log(`  plateformes  ${PLATFORMS.length} ✓`);

  for (const firm of FIRMS) {
    const { data: firmRow, error: fErr } = await db
      .from('firms')
      .upsert({
        slug: firm.slug, name: firm.name,
        website_url: n(firm.website_url), support_url: n(firm.support_url), discord_url: n(firm.discord_url),
        trustpilot_rating: n(firm.trustpilot_rating), trustpilot_count: n(firm.trustpilot_count),
        founded_year: n(firm.founded_year), country: n(firm.country), hq_city: n(firm.hq_city),
        health_score: n(firm.health_score), health_breakdown: n(firm.health_breakdown),
        max_funded_accounts: n(firm.max_funded_accounts), max_eval_accounts: n(firm.max_eval_accounts),
        inactivity_days: n(firm.inactivity_days), restricted_countries: firm.restricted_countries ?? [],
        collects_eu_vat: firm.collects_eu_vat ?? false, daily_flat_time: n(firm.daily_flat_time),
        overnight_allowed: n(firm.overnight_allowed), weekend_allowed: n(firm.weekend_allowed),
        is_published: false,
      }, { onConflict: 'slug' })
      .select('id').single();
    if (fErr) throw new Error(`firm ${firm.slug} : ${fErr.message}`);
    const firmId = firmRow!.id;

    if (firm.styleRules?.length) {
      const { error } = await db.from('firm_style_rules').upsert(
        firm.styleRules.map((r) => ({ firm_id: firmId, ...r })), { onConflict: 'firm_id,rule_key' });
      if (error) throw new Error(`style ${firm.slug} : ${error.message}`);
    }
    if (firm.commissions?.length) {
      const { error } = await db.from('firm_commissions').upsert(
        firm.commissions.map((c) => ({ firm_id: firmId, ...c, symbols: c.symbols ?? [] })),
        { onConflict: 'firm_id,asset_class' });
      if (error) throw new Error(`commissions ${firm.slug} : ${error.message}`);
    }
    if (firm.platforms?.length) {
      const { error } = await db.from('firm_platforms').upsert(
        firm.platforms.map((p) => ({
          firm_id: firmId, platform_id: platformId.get(p.slug),
          is_free: p.is_free ?? true, extra_cost: n(p.extra_cost), note: n(p.note),
        })), { onConflict: 'firm_id,platform_id' });
      if (error) throw new Error(`plateformes ${firm.slug} : ${error.message}`);
    }

    let offerCount = 0;
    for (const plan of firm.plans) {
      const { data: planRow, error: plErr } = await db
        .from('plans')
        .upsert({
          firm_id: firmId, slug: plan.slug, name: plan.name,
          account_kind: plan.account_kind ?? 'evaluation',
          description: n(plan.description), rating: n(plan.rating), rating_note: n(plan.rating_note),
          is_published: false,
        }, { onConflict: 'firm_id,slug' })
        .select('id').single();
      if (plErr) throw new Error(`plan ${firm.slug}/${plan.slug} : ${plErr.message}`);
      const planId = planRow!.id;

      const rows = plan.offers.map((o) => offerRow(firm, planId, plan, o));
      const { data: offerRows, error: oErr } = await db
        .from('offers').upsert(rows, { onConflict: 'plan_id,account_size' }).select('id');
      if (oErr) throw new Error(`offres ${firm.slug}/${plan.slug} : ${oErr.message}`);
      offerCount += rows.length;

      /* Plafonds et paliers : pas de clé naturelle stable → on remplace ceux du
         plan pour rester idempotent, sans jamais toucher une autre offre. */
      const ids = (offerRows ?? []).map((r) => r.id);
      if (ids.length && (plan.payoutCaps?.length || plan.scalingSteps?.length)) {
        if (plan.payoutCaps?.length) {
          await db.from('offer_payout_caps').delete().in('offer_id', ids);
          const caps = ids.flatMap((offerId) =>
            plan.payoutCaps!.map((c) => ({
              offer_id: offerId, variant: n(c.variant), cycle_from: c.cycle_from ?? 1,
              cycle_to: n(c.cycle_to), max_amount: n(c.max_amount), max_pct: n(c.max_pct),
              min_profit: n(c.min_profit), split_pct: n(c.split_pct),
              consistency_pct: n(c.consistency_pct), min_profit_days: n(c.min_profit_days),
              daily_threshold: n(c.daily_threshold), note: n(c.note),
            })));
          const { error } = await db.from('offer_payout_caps').insert(caps);
          if (error) throw new Error(`caps ${firm.slug}/${plan.slug} : ${error.message}`);
        }
        if (plan.scalingSteps?.length) {
          await db.from('offer_scaling_steps').delete().in('offer_id', ids);
          const steps = ids.flatMap((offerId) =>
            plan.scalingSteps!.map((s) => ({
              offer_id: offerId, profit_from: s.profit_from, profit_to: n(s.profit_to),
              max_minis: n(s.max_minis), max_micros: n(s.max_micros), phase: s.phase ?? 'funded',
            })));
          const { error } = await db.from('offer_scaling_steps').insert(steps);
          if (error) throw new Error(`scaling ${firm.slug}/${plan.slug} : ${error.message}`);
        }
      }
    }
    console.log(`  ${firm.slug.padEnd(24)} ${firm.plans.length} plan(s), ${offerCount} offre(s) ✓`);
  }

  console.log(`\n=== TERMINÉ — tout en brouillon (is_published = false). ===\n`);
}

main().catch((e) => {
  console.error('\nÉCHEC :', e.message, '\n');
  process.exit(1);
});
