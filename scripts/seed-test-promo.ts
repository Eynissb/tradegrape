/**
 * Insère (ou retire) des promos de TEST pour visualiser la vue offres.
 *
 *   npx tsx scripts/seed-test-promo.ts            # insère un jeu de promos test
 *   npx tsx scripts/seed-test-promo.ts --remove   # retire TOUTES les promos test
 *
 * ⚠️ Données FICTIVES — à retirer avant toute mise en ligne (§8/§9). Repérées par
 * `discount_note = TEST_MARKER` → le nettoyage est sûr et n'efface que celles-ci.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const REMOVE = process.argv.includes('--remove');
const TEST_MARKER = 'PROMO TEST — à retirer';

/** Jeu varié : remises différentes, exclusif/non, avec/sans échéance. */
const PROMOS = [
  { pct: 40, code: 'GRAPE40', exclusive: true, days: 30 },
  { pct: 50, code: 'FUTURES50', exclusive: true, days: 14 },
  { pct: 30, code: 'START30', exclusive: false, days: null },
  { pct: 60, code: 'BOOST60', exclusive: true, days: 45 },
  { pct: 25, code: 'WELCOME25', exclusive: false, days: null },
  { pct: 90, code: 'MEGA90', exclusive: true, days: 7 },
];

const env: Record<string, string> = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=');
  if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = createClient<any>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // Toujours nettoyer d'abord (idempotent + support --remove). On efface aussi
  // l'ancien marqueur de la 1re version du script, pour ne pas laisser de doublon.
  await db.from('promo_codes').delete().in('discount_note', [TEST_MARKER, 'Promo de test (à retirer)']);
  if (REMOVE) {
    console.log('\n✓ Toutes les promos test retirées.\n');
    return;
  }

  const { data: firms } = await db
    .from('firms')
    .select('id, name')
    .eq('is_published', true)
    .order('name')
    .limit(PROMOS.length);
  if (!firms?.length) throw new Error('Aucune firm publiée.');

  const rows = firms.map((firm: { id: string; name: string }, i: number) => {
    const p = PROMOS[i % PROMOS.length];
    return {
      firm_id: firm.id,
      code: p.code,
      discount_pct: p.pct,
      is_exclusive: p.exclusive,
      ends_at: p.days ? new Date(Date.now() + p.days * 24 * 60 * 60 * 1000).toISOString() : null,
      is_active: true,
      discount_note: TEST_MARKER,
    };
  });

  const { error } = await db.from('promo_codes').insert(rows);
  if (error) throw error;

  console.log(`\n✓ ${rows.length} promos test insérées :`);
  firms.forEach((f: { name: string }, i: number) => {
    const p = PROMOS[i % PROMOS.length];
    console.log(`   ${f.name.padEnd(22)} ${p.code.padEnd(11)} −${p.pct}%  ${p.exclusive ? 'exclusif' : 'générique'}${p.days ? '' : '  (permanent)'}`);
  });
  console.log(`\n  Retrait : npx tsx scripts/seed-test-promo.ts --remove\n`);
}

main().catch((e) => {
  console.error('\nÉCHEC :', e.message, '\n');
  process.exit(1);
});
