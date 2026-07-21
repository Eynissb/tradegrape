'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ADAPTERS, parseTradesCsv, type ImportPlatform } from '@/lib/journal/trade-csv';

export interface PreviewLine {
  trade_date: string;
  symbol: string;
  pnl: number;
}

export interface PreviewState {
  ok: boolean;
  error?: string;
  accountId?: string;
  platform?: string;
  /** Payloads validés, sérialisés — réinjectés tels quels dans applyImport. */
  rowsJson?: string;
  createCount?: number;
  invalid?: string[];
  invalidCount?: number;
  lines?: PreviewLine[];
}

function isPlatform(v: string): v is ImportPlatform {
  return v in ADAPTERS;
}

/** Étape 1 : parse le CSV selon la plateforme, ne touche PAS la base. */
export async function previewTradesImport(
  _prev: PreviewState,
  formData: FormData,
): Promise<PreviewState> {
  const accountId = String(formData.get('account_id') ?? '');
  const platform = String(formData.get('platform') ?? '');
  const file = formData.get('file');

  if (!accountId) return { ok: false, error: 'Compte manquant.' };
  if (!isPlatform(platform)) return { ok: false, error: 'Plateforme inconnue.' };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choisis un fichier CSV.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non authentifié.' };

  // RLS renverrait vide si le compte n'appartient pas à l'utilisateur.
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id')
    .eq('id', accountId)
    .single<{ id: string }>();
  if (!account) return { ok: false, error: 'Compte introuvable.' };

  const text = await file.text();
  const { trades, headerError } = parseTradesCsv(text, platform);
  if (headerError) return { ok: false, error: headerError };
  if (trades.length === 0) return { ok: false, error: 'Aucune ligne de données.' };

  const invalid = trades.flatMap((t) => t.errors);
  const valid = trades.filter((t) => t.errors.length === 0);
  const payloads = valid.map((t) => t.payload);

  return {
    ok: true,
    accountId,
    platform,
    rowsJson: JSON.stringify(payloads),
    createCount: payloads.length,
    invalid: invalid.slice(0, 12),
    invalidCount: invalid.length,
    lines: payloads.slice(0, 12).map((p) => ({ trade_date: p.trade_date, symbol: p.symbol, pnl: p.pnl })),
  };
}

/** Étape 2 : insère les trades validés (après confirmation humaine). */
export async function applyTradesImport(formData: FormData) {
  const accountId = String(formData.get('account_id') ?? '');
  const rowsJson = String(formData.get('rows') ?? '[]');
  const base = `/app/accounts/${accountId}/import`;

  let rows: Record<string, unknown>[];
  try {
    rows = JSON.parse(rowsJson) as Record<string, unknown>[];
  } catch {
    redirect(`${base}?error=${encodeURIComponent('Données illisibles.')}`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    redirect(`${base}?error=${encodeURIComponent('Rien à importer.')}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id')
    .eq('id', accountId)
    .single<{ id: string }>();
  if (!account) redirect('/app');

  const payload = rows.map((r) => ({ ...r, account_id: accountId, user_id: user.id, source: 'import' }));
  const { error } = await supabase.from('trades').insert(payload);
  if (error) redirect(`${base}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(`/app/accounts/${accountId}?view=historique`);
}
