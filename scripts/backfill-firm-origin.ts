/**
 * Backfill CHIRURGICAL : founded_year / country / hq_city des 4 firms publiées.
 *
 *   npx tsx scripts/backfill-firm-origin.ts            # DRY-RUN
 *   npx tsx scripts/backfill-firm-origin.ts --apply    # écrit
 *
 * Ne touche QUE ces 3 colonnes sur 4 slugs — surtout PAS le seed complet
 * (qui remet is_published:false et écraserait la curation manuelle).
 * Valeurs vérifiées à la source le 2026-07-29 (cf. commentaires seeds).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const ROWS = [
  { slug: 'take-profit-trader', founded_year: 2021, country: 'US', hq_city: 'Orlando' },
  { slug: 'bulenox', founded_year: 2022, country: 'US', hq_city: 'Wilmington' },
  { slug: 'tradeify', founded_year: 2024, country: 'US', hq_city: 'Boca Raton' },
  { slug: 'lucid-trading', founded_year: 2025, country: 'US', hq_city: 'Dover' },
];

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8');
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env manquant');
  return { url, key };
}

async function main() {
  const { url, key } = loadEnv();
  const db = createClient(url, key, { auth: { persistSession: false } });

  for (const r of ROWS) {
    const { data: before, error: selErr } = await db
      .from('firms')
      .select('slug, is_published, founded_year, country, hq_city')
      .eq('slug', r.slug)
      .single();
    if (selErr) throw new Error(`select ${r.slug} : ${selErr.message}`);
    console.log(
      `  ${r.slug.padEnd(20)} avant: ${before.founded_year ?? '—'}/${before.country ?? '—'}/${before.hq_city ?? '—'}` +
        `  →  ${r.founded_year}/${r.country}/${r.hq_city}   (publiée: ${before.is_published})`,
    );
    if (APPLY) {
      const { error } = await db
        .from('firms')
        .update({ founded_year: r.founded_year, country: r.country, hq_city: r.hq_city })
        .eq('slug', r.slug);
      if (error) throw new Error(`update ${r.slug} : ${error.message}`);
    }
  }
  console.log(APPLY ? '\n✓ Écrit.\n' : '\n=== DRY-RUN — relance avec --apply ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
