'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { arr, backWithError, bool, num, req, str } from '@/lib/admin/form';

function buildOfferPayload(fd: FormData) {
  return {
    plan_id: req(fd, 'plan_id'),
    account_size: num(fd, 'account_size'),

    // prix
    price: num(fd, 'price'),
    price_regular: num(fd, 'price_regular'),
    activation_fee: num(fd, 'activation_fee') ?? 0,
    is_recurring: bool(fd, 'is_recurring'),
    currency: req(fd, 'currency') || 'USD',
    vat_included: bool(fd, 'vat_included'),

    // évaluation
    drawdown_type: req(fd, 'drawdown_type'),
    drawdown_amount: num(fd, 'drawdown_amount'),
    drawdown_locks_at_breakeven: bool(fd, 'drawdown_locks_at_breakeven'),
    profit_target: num(fd, 'profit_target'),
    daily_loss_limit: num(fd, 'daily_loss_limit'),
    consistency_pct: num(fd, 'consistency_pct'),
    min_trading_days: num(fd, 'min_trading_days') ?? 1,
    max_minis: num(fd, 'max_minis'),
    max_micros: num(fd, 'max_micros'),

    // funded
    funded_drawdown_type: str(fd, 'funded_drawdown_type'),
    funded_daily_loss: num(fd, 'funded_daily_loss'),
    funded_consistency_pct: num(fd, 'funded_consistency_pct'),
    funded_max_minis: num(fd, 'funded_max_minis'),
    funded_max_micros: num(fd, 'funded_max_micros'),
    profit_split: num(fd, 'profit_split'),
    payout_model: str(fd, 'payout_model'),
    payout_buffer: num(fd, 'payout_buffer'),
    payout_min_amount: num(fd, 'payout_min_amount'),
    payout_frequency_days: num(fd, 'payout_frequency_days'),
    payout_min_days: num(fd, 'payout_min_days'),
    payout_daily_threshold: num(fd, 'payout_daily_threshold'),
    payout_method: str(fd, 'payout_method'),

    platforms: arr(fd, 'platforms'),
    reviewed_at: str(fd, 'reviewed_at'),
    is_published: bool(fd, 'is_published'),
  };
}

export async function saveOffer(formData: FormData) {
  const id = str(formData, 'id');
  const payload = buildOfferPayload(formData);

  const failPath = id
    ? `/admin/offers/${id}`
    : `/admin/offers/new?plan=${payload.plan_id}`;

  if (!payload.plan_id) backWithError('/admin/firms', 'Plan parent manquant.');
  // Le prix peut rester inconnu (NULL) : mieux vaut l'absence qu'un faux 0.
  if (payload.account_size === null) {
    backWithError(failPath, 'La taille de compte est obligatoire.');
  }
  if (!payload.drawdown_type || payload.drawdown_amount === null) {
    backWithError(failPath, 'Le type et le montant de drawdown sont obligatoires.');
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from('offers').update(payload).eq('id', id);
    if (error) backWithError(failPath, error.message);
    revalidatePath(`/admin/offers/${id}`);
    redirect(`/admin/offers/${id}`);
  }

  const { data, error } = await supabase
    .from('offers')
    .insert(payload)
    .select('id')
    .single<{ id: string }>();
  if (error) backWithError(failPath, error.message);

  revalidatePath(`/admin/plans/${payload.plan_id}`);
  redirect(`/admin/plans/${payload.plan_id}`);
}

/**
 * Duplique une offre modèle sur plusieurs tailles de compte.
 * Crée un brouillon par taille (règles copiées, à ajuster ensuite).
 * Ignore les tailles déjà présentes sur le plan (contrainte unique plan+taille).
 */
export async function duplicateOffers(formData: FormData) {
  const planId = req(formData, 'plan_id');
  const templateId = req(formData, 'template_id');
  const failPath = `/admin/plans/${planId}`;

  if (!planId || !templateId) {
    backWithError(failPath, 'Plan et offre modèle requis.');
  }

  // Tailles cibles : liste de nombres > 0, dédupliquées.
  const sizes = arr(formData, 'sizes')
    .map((s) => Number(s.replace(/[\s_]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  const uniqueSizes = [...new Set(sizes)];

  if (uniqueSizes.length === 0) {
    backWithError(failPath, 'Indique au moins une taille valide (ex : 25000, 50000).');
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from('offers')
    .select('*')
    .eq('id', templateId)
    .single<Record<string, unknown>>();

  if (!template || template.plan_id !== planId) {
    backWithError(failPath, 'Offre modèle introuvable pour ce plan.');
  }

  const { data: existingRows } = await supabase
    .from('offers')
    .select('account_size')
    .eq('plan_id', planId)
    .returns<{ account_size: number }[]>();
  const existing = new Set((existingRows ?? []).map((r) => Number(r.account_size)));

  const clone = { ...template };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;

  const rows = uniqueSizes
    .filter((size) => !existing.has(size))
    // La date de vérif ne s'hérite pas : chaque taille se re-vérifie à la source.
    .map((size) => ({ ...clone, account_size: size, is_published: false, reviewed_at: null }));

  const skipped = uniqueSizes.length - rows.length;

  if (rows.length === 0) {
    backWithError(failPath, `Rien à créer : ${skipped} taille(s) déjà présente(s).`);
  }

  const { error } = await supabase.from('offers').insert(rows);
  if (error) backWithError(failPath, error.message);

  const parts = [`${rows.length} offre(s) créée(s) en brouillon`];
  if (skipped > 0) parts.push(`${skipped} ignorée(s) (déjà présentes)`);

  revalidatePath(failPath);
  redirect(`${failPath}?message=${encodeURIComponent(parts.join(' · '))}`);
}

export async function toggleOfferPublish(formData: FormData) {
  const id = str(formData, 'id');
  const back = str(formData, 'back') ?? '/admin/firms';
  const next = str(formData, 'next') === '1';
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase
    .from('offers')
    .update({ is_published: next })
    .eq('id', id);
  if (error) backWithError(back, error.message);

  revalidatePath(back);
  redirect(back);
}

/* ---------------------------------------------- plafonds de payout par cycle */

export async function addPayoutCap(formData: FormData) {
  const offerId = req(formData, 'offer_id');
  const back = `/admin/offers/${offerId}`;
  if (!offerId) backWithError('/admin/firms', 'Offre manquante.');

  const payload = { offer_id: offerId, ...capPayload(formData) };
  if (!capHasContent(payload)) {
    backWithError(back, 'Renseigne au moins un plafond, un split, une cohérence ou un seuil.');
  }

  const supabase = await createClient();
  const { error } = await supabase.from('offer_payout_caps').insert(payload);
  if (error) backWithError(back, error.message);

  revalidatePath(back);
  redirect(`${back}?saved=cap`);
}

/** Champs d'un plafond, partagés par l'ajout et la mise à jour. */
function capPayload(fd: FormData) {
  return {
    cycle_from: num(fd, 'cycle_from') ?? 1,
    cycle_to: num(fd, 'cycle_to'),
    max_amount: num(fd, 'max_amount'),
    max_pct: num(fd, 'max_pct'),
    min_profit: num(fd, 'min_profit'),
    note: str(fd, 'note'),
    variant: str(fd, 'variant'),
    split_pct: num(fd, 'split_pct'),
    consistency_pct: num(fd, 'consistency_pct'),
    min_profit_days: num(fd, 'min_profit_days'),
    daily_threshold: num(fd, 'daily_threshold'),
  };
}

/** Au moins une contrainte : une ligne entièrement vide n'a aucun sens. */
function capHasContent(p: ReturnType<typeof capPayload>): boolean {
  return [
    p.max_amount, p.max_pct, p.min_profit,
    p.split_pct, p.consistency_pct, p.min_profit_days, p.daily_threshold,
  ].some((v) => v !== null);
}

export async function updatePayoutCap(formData: FormData) {
  const offerId = req(formData, 'offer_id');
  const id = str(formData, 'id');
  const back = `/admin/offers/${offerId}`;
  if (!offerId || !id) redirect('/admin/firms');

  const payload = capPayload(formData);
  if (!capHasContent(payload)) {
    backWithError(`${back}?edit_cap=${id}`, 'Renseigne au moins un plafond, un split, une cohérence ou un seuil.');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('offer_payout_caps')
    .update(payload)
    .eq('id', id)
    .eq('offer_id', offerId);
  if (error) backWithError(`${back}?edit_cap=${id}`, error.message);

  revalidatePath(back);
  redirect(`${back}?saved=cap-edit`);
}

export async function deletePayoutCap(formData: FormData) {
  const offerId = req(formData, 'offer_id');
  const id = str(formData, 'id');
  if (!offerId || !id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('offer_payout_caps').delete().eq('id', id);
  if (error) backWithError(`/admin/offers/${offerId}`, error.message);

  revalidatePath(`/admin/offers/${offerId}`);
  redirect(`/admin/offers/${offerId}?saved=cap-del`);
}

/* ------------------------------------------------ paliers de scaling (funded) */

const SCALING_PHASES = ['funded', 'evaluation'];

export async function addScalingStep(formData: FormData) {
  const offerId = req(formData, 'offer_id');
  const back = `/admin/offers/${offerId}`;
  if (!offerId) backWithError('/admin/firms', 'Offre manquante.');

  const phase = str(formData, 'phase') ?? 'funded';
  const payload = {
    offer_id: offerId,
    profit_from: num(formData, 'profit_from'),
    profit_to: num(formData, 'profit_to'),
    max_minis: num(formData, 'max_minis'),
    max_micros: num(formData, 'max_micros'),
    phase: SCALING_PHASES.includes(phase) ? phase : 'funded',
  };

  if (payload.profit_from === null) {
    backWithError(back, 'Le seuil de profit « à partir de » est obligatoire.');
  }
  if (payload.max_minis === null && payload.max_micros === null) {
    backWithError(back, 'Renseigne au moins un plafond de contrats (minis ou micros).');
  }

  const supabase = await createClient();
  const { error } = await supabase.from('offer_scaling_steps').insert(payload);
  if (error) backWithError(back, error.message);

  revalidatePath(back);
  redirect(`${back}?saved=scaling`);
}

export async function deleteScalingStep(formData: FormData) {
  const offerId = req(formData, 'offer_id');
  const id = str(formData, 'id');
  if (!offerId || !id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('offer_scaling_steps').delete().eq('id', id);
  if (error) backWithError(`/admin/offers/${offerId}`, error.message);

  revalidatePath(`/admin/offers/${offerId}`);
  redirect(`/admin/offers/${offerId}?saved=scaling-del`);
}

export async function deleteOffer(formData: FormData) {
  const id = str(formData, 'id');
  const planId = str(formData, 'plan_id');
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('offers').delete().eq('id', id);
  if (error) backWithError(`/admin/offers/${id}`, error.message);

  const back = planId ? `/admin/plans/${planId}` : '/admin/firms';
  revalidatePath(back);
  redirect(back);
}
