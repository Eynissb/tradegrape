'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { arr, backWithError, bool, num, req, str } from '@/lib/admin/form';
import { STYLE_RULE_KEYS, STANCES } from '@/lib/catalog/style-rules';

function buildFirmPayload(fd: FormData) {
  return {
    slug: req(fd, 'slug'),
    name: req(fd, 'name'),
    market_type: req(fd, 'market_type') || 'futures',
    logo_url: str(fd, 'logo_url'),
    website_url: str(fd, 'website_url'),
    support_url: str(fd, 'support_url'),
    discord_url: str(fd, 'discord_url'),
    affiliate_url: str(fd, 'affiliate_url'),
    default_url: str(fd, 'default_url'),
    affiliate_active: bool(fd, 'affiliate_active'),
    commission_note: str(fd, 'commission_note'),
    founded_year: num(fd, 'founded_year'),
    country: str(fd, 'country'),
    hq_city: str(fd, 'hq_city'),
    trustpilot_rating: num(fd, 'trustpilot_rating'),
    trustpilot_count: num(fd, 'trustpilot_count'),
    trustpilot_url: str(fd, 'trustpilot_url'),
    health_score: num(fd, 'health_score'),
    max_funded_accounts: num(fd, 'max_funded_accounts'),
    max_eval_accounts: num(fd, 'max_eval_accounts'),
    inactivity_days: num(fd, 'inactivity_days'),
    restricted_countries: arr(fd, 'restricted_countries', { upper: true }),
    collects_eu_vat: bool(fd, 'collects_eu_vat'),
    daily_flat_time: str(fd, 'daily_flat_time'),
    overnight_allowed: bool(fd, 'overnight_allowed'),
    weekend_allowed: bool(fd, 'weekend_allowed'),
    is_active: bool(fd, 'is_active'),
    is_published: bool(fd, 'is_published'),
    sort_order: num(fd, 'sort_order') ?? 0,
  };
}

export async function saveFirm(formData: FormData) {
  const id = str(formData, 'id');
  const payload = buildFirmPayload(formData);

  if (!payload.name || !payload.slug) {
    backWithError(
      id ? `/admin/firms/${id}` : '/admin/firms/new',
      'Le nom et le slug sont obligatoires.',
    );
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from('firms').update(payload).eq('id', id);
    if (error) backWithError(`/admin/firms/${id}`, error.message);
  } else {
    const { error } = await supabase.from('firms').insert(payload);
    if (error) backWithError('/admin/firms/new', error.message);
  }

  revalidatePath('/admin/firms');
  redirect('/admin/firms');
}

/**
 * Enregistre les règles de style d'une firm en une passe : upsert des positions
 * spécifiées, suppression de celles repassées à « — non spécifié ».
 */
export async function saveStyleRules(formData: FormData) {
  const firmId = req(formData, 'firm_id');
  const back = `/admin/firms/${firmId}`;
  if (!firmId) backWithError('/admin/firms', 'Firm manquante.');

  const validStances = new Set(STANCES.map((s) => s.value));
  const toUpsert: {
    firm_id: string;
    rule_key: string;
    stance: string;
    threshold_note: string | null;
    detail: string | null;
  }[] = [];
  const toClear: string[] = [];

  for (const { key } of STYLE_RULE_KEYS) {
    const stance = str(formData, `stance__${key}`);
    if (stance && validStances.has(stance)) {
      toUpsert.push({
        firm_id: firmId,
        rule_key: key,
        stance,
        threshold_note: str(formData, `threshold__${key}`),
        detail: str(formData, `detail__${key}`),
      });
    } else {
      toClear.push(key);
    }
  }

  const supabase = await createClient();

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('firm_style_rules')
      .upsert(toUpsert, { onConflict: 'firm_id,rule_key' });
    if (error) backWithError(back, error.message);
  }
  if (toClear.length > 0) {
    const { error } = await supabase
      .from('firm_style_rules')
      .delete()
      .eq('firm_id', firmId)
      .in('rule_key', toClear);
    if (error) backWithError(back, error.message);
  }

  revalidatePath(back);
  redirect(`${back}?saved=style`);
}

export async function toggleFirmPublish(formData: FormData) {
  const id = str(formData, 'id');
  const back = str(formData, 'back') ?? '/admin/firms';
  const next = str(formData, 'next') === '1';
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase
    .from('firms')
    .update({ is_published: next })
    .eq('id', id);
  if (error) backWithError(back, error.message);

  revalidatePath(back);
  redirect(back);
}

export async function deleteFirm(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('firms').delete().eq('id', id);
  if (error) backWithError(`/admin/firms/${id}`, error.message);

  revalidatePath('/admin/firms');
  redirect('/admin/firms');
}
