'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { csvRowsToOffers, parseCsv } from '@/lib/admin/offer-csv';

const MAX_ROWS = 500;

export interface PreviewLine {
  account_size: number;
  action: 'create' | 'update';
}

export interface PreviewState {
  ok: boolean;
  error?: string;
  planId?: string;
  /** Payloads validés, sérialisés — réinjectés tels quels dans applyImport. */
  rowsJson?: string;
  createCount?: number;
  updateCount?: number;
  invalid?: string[];
  lines?: PreviewLine[];
}

/** Étape 1 : parse le CSV, classe créer/mettre à jour, ne touche PAS la base. */
export async function previewImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const profile = await getProfile();
  if (!profile || !isStaff(profile.role)) {
    return { ok: false, error: 'Accès réservé au staff.' };
  }

  const planId = String(formData.get('plan_id') ?? '');
  const file = formData.get('file');
  if (!planId) return { ok: false, error: 'Plan manquant.' };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choisis un fichier CSV.' };
  }

  const text = await file.text();
  const { offers, headerError } = csvRowsToOffers(parseCsv(text));
  if (headerError) return { ok: false, error: headerError };
  if (offers.length === 0) return { ok: false, error: 'Aucune ligne de données.' };
  if (offers.length > MAX_ROWS) {
    return { ok: false, error: `Trop de lignes (${offers.length} > ${MAX_ROWS}).` };
  }

  const invalid = offers.flatMap((o) => o.errors);
  const valid = offers.filter((o) => o.errors.length === 0);

  const supabase = await createClient();
  const { data: existingRows } = await supabase
    .from('offers')
    .select('account_size')
    .eq('plan_id', planId)
    .returns<{ account_size: number }[]>();
  const existing = new Set((existingRows ?? []).map((r) => Number(r.account_size)));

  const payloads: Record<string, unknown>[] = valid.map((o) => ({
    ...o.payload,
    plan_id: planId,
  }));
  const lines: PreviewLine[] = payloads.map((p) => {
    const size = Number(p.account_size);
    return { account_size: size, action: existing.has(size) ? 'update' : 'create' };
  });

  return {
    ok: true,
    planId,
    rowsJson: JSON.stringify(payloads),
    createCount: lines.filter((l) => l.action === 'create').length,
    updateCount: lines.filter((l) => l.action === 'update').length,
    invalid,
    lines,
  };
}

/** Étape 2 : applique l'upsert sur les payloads validés (après confirmation humaine). */
export async function applyImport(formData: FormData) {
  const planId = String(formData.get('plan_id') ?? '');
  const rowsJson = String(formData.get('rows') ?? '[]');
  const backBase = planId ? `/admin/plans/${planId}` : '/admin/firms';

  let rows: Record<string, unknown>[];
  try {
    rows = JSON.parse(rowsJson) as Record<string, unknown>[];
  } catch {
    redirect(`/admin/offers/import?plan=${planId}&error=${encodeURIComponent('Données illisibles.')}`);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    redirect(`/admin/offers/import?plan=${planId}&error=${encodeURIComponent('Rien à importer.')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('offers')
    .upsert(rows, { onConflict: 'plan_id,account_size' });

  if (error) {
    redirect(`/admin/offers/import?plan=${planId}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(backBase);
  redirect(`${backBase}?message=${encodeURIComponent(`${rows.length} offre(s) importée(s).`)}`);
}
