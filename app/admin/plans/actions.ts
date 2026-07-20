'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { backWithError, bool, num, req, str } from '@/lib/admin/form';

function buildPlanPayload(fd: FormData) {
  return {
    firm_id: req(fd, 'firm_id'),
    slug: req(fd, 'slug'),
    name: req(fd, 'name'),
    account_kind: req(fd, 'account_kind') || 'evaluation',
    description: str(fd, 'description'),
    rating: num(fd, 'rating'),
    rating_note: str(fd, 'rating_note'),
    is_published: bool(fd, 'is_published'),
    sort_order: num(fd, 'sort_order') ?? 0,
  };
}

export async function savePlan(formData: FormData) {
  const id = str(formData, 'id');
  const payload = buildPlanPayload(formData);

  const failPath = id
    ? `/admin/plans/${id}`
    : `/admin/plans/new?firm=${payload.firm_id}`;

  if (!payload.firm_id) backWithError('/admin/firms', 'Firm parente manquante.');
  if (!payload.name || !payload.slug) {
    backWithError(failPath, 'Le nom et le slug sont obligatoires.');
  }

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from('plans').update(payload).eq('id', id);
    if (error) backWithError(failPath, error.message);
    revalidatePath(`/admin/plans/${id}`);
    redirect(`/admin/plans/${id}`);
  }

  const { data, error } = await supabase
    .from('plans')
    .insert(payload)
    .select('id')
    .single<{ id: string }>();
  if (error) backWithError(failPath, error.message);

  revalidatePath(`/admin/firms/${payload.firm_id}`);
  redirect(`/admin/plans/${data!.id}`);
}

export async function togglePlanPublish(formData: FormData) {
  const id = str(formData, 'id');
  const back = str(formData, 'back') ?? '/admin/firms';
  const next = str(formData, 'next') === '1';
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase
    .from('plans')
    .update({ is_published: next })
    .eq('id', id);
  if (error) backWithError(back, error.message);

  revalidatePath(back);
  redirect(back);
}

/** « Tout publier » : publie le plan ET toutes ses offres d'un coup. */
export async function publishAllOffers(formData: FormData) {
  const planId = str(formData, 'plan_id');
  if (!planId) redirect('/admin/firms');
  const back = `/admin/plans/${planId}`;

  const supabase = await createClient();
  const { error: planErr } = await supabase
    .from('plans')
    .update({ is_published: true })
    .eq('id', planId);
  if (planErr) backWithError(back, planErr.message);

  const { error: offersErr } = await supabase
    .from('offers')
    .update({ is_published: true })
    .eq('plan_id', planId);
  if (offersErr) backWithError(back, offersErr.message);

  revalidatePath(back);
  redirect(`${back}?message=${encodeURIComponent('Plan et offres publiés.')}`);
}

export async function deletePlan(formData: FormData) {
  const id = str(formData, 'id');
  const firmId = str(formData, 'firm_id');
  if (!id) redirect('/admin/firms');

  const supabase = await createClient();
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) backWithError(`/admin/plans/${id}`, error.message);

  const back = firmId ? `/admin/firms/${firmId}` : '/admin/firms';
  revalidatePath(back);
  redirect(back);
}
