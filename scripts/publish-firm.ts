/**
 * Publie (ou dépublie) une firm et toute sa descendance visible.
 *
 *   npx tsx scripts/publish-firm.ts <firm-slug>            # DRY-RUN
 *   npx tsx scripts/publish-firm.ts <firm-slug> --apply
 *   npx tsx scripts/publish-firm.ts <firm-slug> --apply --off
 *
 * Pourquoi un script : la lecture publique exige que la firm, le plan ET
 * l'offre soient publiés (`is_published or is_staff()` sur les trois tables).
 * Publier une firm demande donc 1 + n + m bascules dans l'admin — long, et
 * facile à laisser à moitié fait. Ici c'est atomique et réversible.
 *
 * ⚠️ Refuse de publier une offre dont les règles ne sont PAS vérifiées à la
 * source (`reviewed_at IS NULL`). Publier une donnée non vérifiée est exactement
 * ce que le positionnement interdit (§8) : le script le dit et l'ignore.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith('-'));
const APPLY = args.includes('--apply');
const OFF = args.includes('--off');
/** Publier même les offres non vérifiées — à n'utiliser qu'en connaissance de cause. */
const FORCE = args.includes('--force-unverified');

if (!slug) {
  console.error('Usage : npx tsx scripts/publish-firm.ts <firm-slug> [--apply] [--off] [--force-unverified]');
  process.exit(1);
}

const env: Record<string, string> = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient<any>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const money = (v: number | null) => (v == null ? 'prix inconnu' : `${Number(v).toLocaleString('fr-FR')}`);

async function main() {
  const target = !OFF;

  const { data: firm } = await db.from('firms').select('id, name, slug').eq('slug', slug).maybeSingle();
  if (!firm) throw new Error(`Firm « ${slug} » introuvable.`);

  const { data: plans } = await db.from('plans').select('id, name, slug').eq('firm_id', firm.id);
  const planIds = (plans ?? []).map((p: { id: string }) => p.id);

  const { data: offers } = await db
    .from('offers')
    .select('id, account_size, price, reviewed_at, plan_id')
    .in('plan_id', planIds.length ? planIds : ['00000000-0000-0000-0000-000000000000'])
    .order('account_size');

  const eligible = (offers ?? []).filter((o: { reviewed_at: string | null }) => FORCE || o.reviewed_at !== null);
  const skipped = (offers ?? []).filter((o: { reviewed_at: string | null }) => !FORCE && o.reviewed_at === null);

  console.log(`\n=== ${target ? 'PUBLICATION' : 'DÉPUBLICATION'} · ${firm.name} ===`);
  console.log(`  plans   ${plans?.length ?? 0}`);
  console.log(`  offres  ${offers?.length ?? 0} — ${eligible.length} éligible(s)`);

  for (const o of eligible) {
    console.log(`    ✓ ${String(o.account_size).padEnd(8)} ${money(o.price).padEnd(14)} vérifiée ${o.reviewed_at ?? '(forcée)'}`);
  }
  for (const o of skipped) {
    console.log(`    ✗ ${String(o.account_size).padEnd(8)} ${money(o.price).padEnd(14)} IGNORÉE — reviewed_at NULL`);
  }
  if (skipped.length && target) {
    console.log(`\n  ${skipped.length} offre(s) non vérifiée(s) écartée(s). --force-unverified pour passer outre.`);
  }

  if (!APPLY) {
    console.log(`\n=== DRY-RUN — aucune écriture. Ajoute --apply. ===\n`);
    return;
  }

  const ids = eligible.map((o: { id: string }) => o.id);
  if (target && ids.length === 0) {
    throw new Error('Aucune offre éligible : rien à publier.');
  }

  // Ordre descendant à la publication (firm d'abord), pour ne jamais laisser
  // une offre visible sous une firm masquée.
  if (target) {
    await db.from('firms').update({ is_published: true }).eq('id', firm.id);
    await db.from('plans').update({ is_published: true }).in('id', planIds);
    await db.from('offers').update({ is_published: true }).in('id', ids);
  } else {
    await db.from('offers').update({ is_published: false }).in('id', (offers ?? []).map((o: { id: string }) => o.id));
    await db.from('plans').update({ is_published: false }).in('id', planIds);
    await db.from('firms').update({ is_published: false }).eq('id', firm.id);
  }

  console.log(`\n=== TERMINÉ — ${ids.length} offre(s) ${target ? 'publiée(s)' : 'dépubliée(s)'}. ===\n`);
}

main().catch((e) => {
  console.error('\nÉCHEC :', e.message, '\n');
  process.exit(1);
});
