/**
 * Relecture DEPUIS LA BASE du catalogue seedé — lecture seule.
 *
 *   npx tsx scripts/inspect-catalog.ts            # compteurs
 *   npx tsx scripts/inspect-catalog.ts <slug>…    # détail d'une ou plusieurs firms
 *
 * Sert à vérifier ce qui a RÉELLEMENT été écrit, plutôt que ce qu'on croit
 * avoir écrit : les valeurs sont relues, pas rejouées depuis le fichier source.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { evaluatePayout } from '@/lib/rules/futures-engine';

const env: Record<string, string> = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient<any>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const money = (v: number | null) => (v == null ? '—' : Number(v).toLocaleString('fr-FR'));
const pct = (v: number | null) => (v == null ? 'null' : `${Number(v)}%`);

async function counts() {
  console.log(`\n=== COMPTEURS ===`);
  for (const t of ['platforms', 'firms', 'plans', 'offers', 'offer_payout_caps', 'offer_scaling_steps']) {
    const { count } = await db.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t.padEnd(22)} ${count ?? 0}`);
  }
  const { count: unverified } = await db
    .from('offers').select('*', { count: 'exact', head: true }).is('reviewed_at', null);
  const { count: noPrice } = await db
    .from('offers').select('*', { count: 'exact', head: true }).is('price', null);
  const { count: published } = await db
    .from('offers').select('*', { count: 'exact', head: true }).eq('is_published', true);
  console.log(`\n  à revérifier (reviewed_at null)   ${unverified ?? 0}`);
  console.log(`  prix inconnu (price null)         ${noPrice ?? 0}`);
  console.log(`  publiées                          ${published ?? 0}`);

  const { data: firms } = await db.from('firms').select('slug, health_score').order('slug');
  console.log(`\n  firms : ${(firms ?? []).map((f: { slug: string }) => f.slug).join(', ')}`);
}

async function detail(slug: string) {
  const { data: firm } = await db
    .from('firms').select('id, name, slug, health_score').eq('slug', slug).maybeSingle();
  if (!firm) return console.log(`\n  « ${slug} » absente.`);

  console.log(`\n=== ${firm.name} ===`);
  if (firm.health_score != null) console.log(`  health_score : ${firm.health_score}`);

  const { data: plans } = await db
    .from('plans').select('id, slug, name').eq('firm_id', firm.id).order('slug');

  for (const plan of plans ?? []) {
    const { data: offers } = await db
      .from('offers')
      .select('id, account_size, price, drawdown_type, drawdown_amount, drawdown_locks_at_breakeven, consistency_pct, funded_drawdown_type, funded_consistency_pct, payout_buffer, profit_split, reviewed_at')
      .eq('plan_id', plan.id).order('account_size');

    console.log(`\n  ── ${plan.name} (${plan.slug})`);
    console.log(`     ${'taille'.padEnd(10)}${'dd éval'.padEnd(16)}${'dd financé'.padEnd(13)}${'cohér. éval'.padEnd(13)}${'cohér. fin.'.padEnd(13)}${'buffer'.padEnd(12)}vérifiée`);
    for (const o of offers ?? []) {
      const lock = o.drawdown_locks_at_breakeven ? '' : ' (non verrouillé)';
      console.log(
        `     ${money(o.account_size).padEnd(10)}` +
        `${(o.drawdown_type + ' ' + money(o.drawdown_amount) + lock).padEnd(16)}` +
        `${String(o.funded_drawdown_type ?? '—').padEnd(13)}` +
        `${pct(o.consistency_pct).padEnd(13)}` +
        `${pct(o.funded_consistency_pct).padEnd(13)}` +
        `${money(o.payout_buffer).padEnd(12)}` +
        `${o.reviewed_at ?? 'non'}`,
      );
    }

    const ids = (offers ?? []).map((o: { id: string }) => o.id);
    if (ids.length) {
      const { data: caps } = await db
        .from('offer_payout_caps')
        .select('offer_id, variant, cycle_from, cycle_to, max_amount, split_pct, consistency_pct, min_profit_days')
        .in('offer_id', ids).order('variant').order('cycle_from');
      for (const c of caps ?? []) {
        const size = (offers ?? []).find((o: { id: string }) => o.id === c.offer_id)?.account_size;
        const range = c.cycle_to == null ? `${c.cycle_from}+` : `${c.cycle_from}-${c.cycle_to}`;
        const bits = [
          c.max_amount != null ? `max ${money(c.max_amount)}` : null,
          c.split_pct != null ? `split ${c.split_pct}%` : null,
          c.consistency_pct != null ? `cohér. ${c.consistency_pct}%` : null,
          c.min_profit_days != null ? `${c.min_profit_days} j` : null,
        ].filter(Boolean).join(', ');
        console.log(`     plafond ${money(size)} · ${(c.variant ?? 'unique').padEnd(12)} cycle ${range.padEnd(5)} ${bits}`);
      }
    }
  }
}

/**
 * Vérifie qu'un buffer relu depuis la base produit un retirable SENSÉ.
 * C'est le contrôle qui aurait attrapé l'erreur d'unité sur MFF : un buffer
 * saisi en ÉCART (1 100) au lieu d'un SOLDE (26 100) rend presque tout le
 * capital « retirable ».
 */
async function checkBuffers() {
  console.log(`\n=== CONTRÔLE DES BUFFERS (retirable sur un gain de +2 000) ===`);
  const { data: offers } = await db
    .from('offers')
    .select('account_size, payout_buffer, payout_min_amount, payout_min_days, plan:plans!inner(name, firm:firms!inner(name))')
    .not('payout_buffer', 'is', null)
    .order('account_size');

  let suspects = 0;
  for (const o of offers ?? []) {
    const start = Number(o.account_size);
    const balance = start + 2_000;
    const ev = evaluatePayout(
      { buffer: Number(o.payout_buffer), minAmount: null, minProfitDays: null,
        dailyThreshold: null, consistencyPct: null, minCycleProfit: null,
        maxAmount: null, maxPct: null },
      start, balance, [],
    );
    // Un retirable supérieur au gain du cycle trahit un buffer sous le capital.
    const suspect = ev.withdrawable > 2_000;
    if (suspect) suspects++;
    // PostgREST rend les jointures imbriquées sous forme de tableaux.
    const plan = Array.isArray(o.plan) ? o.plan[0] : o.plan;
    const firmRel = plan && (Array.isArray(plan.firm) ? plan.firm[0] : plan.firm);
    const firmName = firmRel?.name ?? '?';
    console.log(
      `  ${suspect ? '✗' : '✓'} ${String(firmName).padEnd(22)}${money(start).padEnd(10)}` +
      `buffer ${money(o.payout_buffer).padEnd(12)}retirable ${money(ev.withdrawable)}`,
    );
  }
  console.log(`\n  ${suspects === 0 ? 'Aucun buffer suspect.' : `${suspects} buffer(s) SUSPECT(S) — unité probablement fausse.`}`);
}

async function main() {
  if (slugs.length === 0) {
    await counts();
    return;
  }
  for (const s of slugs) await detail(s);
  if (process.argv.includes('--buffers')) await checkBuffers();
}

main().catch((e) => { console.error('ÉCHEC :', e.message); process.exit(1); });
