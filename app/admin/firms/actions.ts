'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/* Helpers de parsing formData → types DB (chaîne vide = null). */
function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
}
function req(fd: FormData, key: string): string {
  return str(fd, key) ?? '';
}
function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}
function arr(fd: FormData, key: string): string[] {
  const s = str(fd, key);
  if (s === null) return [];
  return s
    .split(',')
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

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
    restricted_countries: arr(fd, 'restricted_countries'),
    collects_eu_vat: bool(fd, 'collects_eu_vat'),
    daily_flat_time: str(fd, 'daily_flat_time'),
    overnight_allowed: bool(fd, 'overnight_allowed'),
    weekend_allowed: bool(fd, 'weekend_allowed'),
    is_active: bool(fd, 'is_active'),
    is_published: bool(fd, 'is_published'),
    sort_order: num(fd, 'sort_order') ?? 0,
  };
}

function backWithError(basePath: string, message: string): never {
  redirect(`${basePath}?error=${encodeURIComponent(message)}`);
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

export async function deleteFirm(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('firms').delete().eq('id', id);
  if (error) backWithError(`/admin/firms/${id}`, error.message);

  revalidatePath('/admin/firms');
  redirect('/admin/firms');
}
