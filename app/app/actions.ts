'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { num, str } from '@/lib/admin/form';
import { feesForTrade } from '@/lib/journal/commissions';
import {
  buildManualSnapshot,
  buildRulesSnapshot,
  type OfferRuleRow,
  type RulesSnapshot,
} from '@/lib/journal/snapshot';
import type { DrawdownType, OfferRules } from '@/lib/rules/types';

const DRAWDOWN_TYPES: DrawdownType[] = ['EOD', 'TRAIL', 'STATIC'];
const JOURNAL_STATUSES = ['evaluation', 'funded', 'passed', 'failed', 'archived'] as const;

const OFFER_COLS =
  'account_size, currency, drawdown_type, drawdown_amount, profit_target, daily_loss_limit, consistency_pct, min_trading_days, funded_consistency_pct, payout_buffer, payout_min_amount, payout_min_days, payout_daily_threshold, profit_split, payout_model, plan_id';

function backWithError(path: string, message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

/** Champs modifiables d'un trade, partagés par l'ajout et l'édition. */
function tradeFields(formData: FormData, date: string, pnl: number) {
  const detailed = str(formData, 'mode') === 'detailed';
  const tags = formData
    .getAll('tags')
    .map((t) => String(t))
    .filter(Boolean);
  // Heure de clôture (trade détaillé) → alimente la ventilation analytics par heure.
  // À défaut, midi : les entrées journalières sont de toute façon exclues du par-heure.
  const time = detailed ? str(formData, 'trade_time') : null;
  const closedAt = time && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;
  return {
    symbol: detailed ? str(formData, 'symbol') ?? '' : '',
    direction: detailed ? str(formData, 'direction') : null,
    quantity: detailed ? num(formData, 'quantity') : null,
    entry_price: detailed ? num(formData, 'entry_price') : null,
    exit_price: detailed ? num(formData, 'exit_price') : null,
    pnl,
    fees: num(formData, 'fees') ?? 0,
    closed_at: closedAt,
    trade_date: date,
    notes: str(formData, 'notes'),
    tags,
  };
}

export async function createAccount(formData: FormData) {
  const offerId = str(formData, 'offer_id');
  const label = str(formData, 'label');
  if (!offerId) backWithError('/app/accounts/new', 'Choisis une offre.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const { data: offer } = await supabase
    .from('offers')
    .select(`${OFFER_COLS}, price`)
    .eq('id', offerId)
    .single<OfferRuleRow & { plan_id: string; price: number | null }>();
  if (!offer) backWithError('/app/accounts/new', 'Offre introuvable ou non publiée.');

  const { data: plan } = await supabase
    .from('plans')
    .select('name, slug, firm_id')
    .eq('id', offer.plan_id)
    .single<{ name: string; slug: string; firm_id: string }>();
  if (!plan) backWithError('/app/accounts/new', 'Plan introuvable.');

  const { data: firm } = await supabase
    .from('firms')
    .select('name, slug, market_type')
    .eq('id', plan.firm_id)
    .single<{ name: string; slug: string; market_type: OfferRules['marketType'] }>();
  if (!firm) backWithError('/app/accounts/new', 'Firm introuvable.');

  const snapshot = buildRulesSnapshot(offer, firm.market_type, firm, plan);
  const size = Number(offer.account_size);

  const { data: account, error } = await supabase
    .from('journal_accounts')
    .insert({
      user_id: user.id,
      offer_id: offerId,
      rules_snapshot: snapshot,
      label: label ?? `${firm.name} ${plan.name} · ${size.toLocaleString('fr-FR')}`,
      account_size: size,
      starting_balance: size,
      status: 'evaluation',
      phase: 'evaluation',
    })
    .select('id')
    .single<{ id: string }>();

  if (error) backWithError('/app/accounts/new', error.message);

  // Enregistre l'achat du challenge, pré-rempli au prix de l'offre (modifiable ensuite).
  // Best-effort : n'empêche pas la création du compte si l'insert échoue.
  if (offer.price != null) {
    await supabase.from('account_purchases').insert({
      journal_account_id: account!.id,
      user_id: user.id,
      kind: 'challenge',
      amount: Number(offer.price),
      currency: offer.currency ?? 'USD',
      purchased_at: new Date().toISOString().slice(0, 10),
    });
  }

  revalidatePath('/app');
  redirect(`/app/accounts/${account!.id}`);
}

export async function createManualAccount(formData: FormData) {
  const base = '/app/accounts/new';
  const firmName = str(formData, 'firm_name');
  const size = num(formData, 'account_size');
  const ddType = str(formData, 'drawdown_type');
  const ddAmount = num(formData, 'drawdown_amount');

  if (!firmName) backWithError(base, 'Le nom de la firm est obligatoire.');
  if (size === null || size <= 0) backWithError(base, 'La taille du compte est obligatoire.');
  if (!ddType || !DRAWDOWN_TYPES.includes(ddType as DrawdownType)) {
    backWithError(base, 'Type de drawdown invalide.');
  }
  if (ddAmount === null) backWithError(base, 'Le montant du drawdown est obligatoire.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const snapshot = buildManualSnapshot({
    firmName,
    accountSize: size,
    drawdownType: ddType as DrawdownType,
    drawdownAmount: ddAmount,
    profitTarget: num(formData, 'profit_target'),
    dailyLossLimit: num(formData, 'daily_loss_limit'),
    consistencyPct: num(formData, 'consistency_pct'),
    minTradingDays: num(formData, 'min_trading_days') ?? 1,
    currency: str(formData, 'currency') ?? 'USD',
    payout: {
      buffer: num(formData, 'payout_buffer'),
      minAmount: num(formData, 'payout_min_amount'),
      minProfitDays: num(formData, 'payout_min_days'),
      dailyThreshold: num(formData, 'payout_daily_threshold'),
      consistencyPct: num(formData, 'funded_consistency_pct'),
      minCycleProfit: null,
      maxAmount: null,
      maxPct: null,
    },
  });

  const { data: account, error } = await supabase
    .from('journal_accounts')
    .insert({
      user_id: user.id,
      offer_id: null,
      rules_snapshot: snapshot,
      label: str(formData, 'label') ?? `${firmName} · ${size.toLocaleString('fr-FR')}`,
      account_size: size,
      starting_balance: size,
      status: 'evaluation',
      phase: 'evaluation',
    })
    .select('id')
    .single<{ id: string }>();

  if (error) backWithError(base, error.message);

  // Enregistre la demande de firm (best-effort : ne bloque pas la création du compte
  // si la migration requested_firms n'est pas encore appliquée).
  await supabase.rpc('record_firm_request', { firm_name: firmName });

  revalidatePath('/app');
  redirect(`/app/accounts/${account!.id}`);
}

export async function addTrade(formData: FormData) {
  const accountId = str(formData, 'account_id');
  const date = str(formData, 'trade_date');
  const pnl = num(formData, 'pnl');
  const base = `/app/accounts/${accountId}`;

  if (!accountId) redirect('/app');
  if (!date) backWithError(base, 'La date est obligatoire.');
  if (pnl === null) backWithError(base, 'Le P&L est obligatoire.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  // Vérifie que le compte appartient bien à l'utilisateur (RLS le renverrait vide sinon).
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id')
    .eq('id', accountId)
    .single<{ id: string }>();
  if (!account) backWithError('/app', 'Compte introuvable.');

  const { error } = await supabase.from('trades').insert({
    account_id: accountId,
    user_id: user.id,
    source: 'manual',
    ...tradeFields(formData, date, pnl),
  });

  if (error) backWithError(base, error.message);

  revalidatePath(base);
  // Retour sur le mois de l'entrée, jour surligné → confirmation visuelle de la saisie.
  redirect(`${base}?view=calendrier&month=${date.slice(0, 7)}&highlight=${date}`);
}

export async function updateTrade(formData: FormData) {
  const id = str(formData, 'id');
  const accountId = str(formData, 'account_id');
  const date = str(formData, 'trade_date');
  const pnl = num(formData, 'pnl');
  const base = `/app/accounts/${accountId}`;

  if (!id || !accountId) redirect('/app');
  if (!date) backWithError(`/app/accounts/${accountId}/trades/${id}`, 'La date est obligatoire.');
  if (pnl === null) backWithError(`/app/accounts/${accountId}/trades/${id}`, 'Le P&L est obligatoire.');

  const supabase = await createClient();
  // RLS « trades owner » garantit qu'on ne met à jour que ses propres trades.
  const { error } = await supabase
    .from('trades')
    .update(tradeFields(formData, date, pnl))
    .eq('id', id);

  if (error) backWithError(`/app/accounts/${accountId}/trades/${id}`, error.message);

  revalidatePath(base);
  redirect(`${base}?view=calendrier&month=${date.slice(0, 7)}&highlight=${date}`);
}

export async function deleteTrade(formData: FormData) {
  const id = str(formData, 'id');
  const accountId = str(formData, 'account_id');
  if (!id || !accountId) redirect('/app');

  const supabase = await createClient();
  const { error } = await supabase.from('trades').delete().eq('id', id);
  const base = `/app/accounts/${accountId}`;
  if (error) backWithError(base, error.message);

  revalidatePath(base);
  redirect(base);
}

/** Paramètres — général : nom et statut du compte. */
export async function saveAccountGeneral(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/app');
  const base = `/app/accounts/${id}/settings`;

  const label = str(formData, 'label');
  const status = str(formData, 'status');
  if (!label) backWithError(base, 'Le nom du compte est obligatoire.');
  if (!status || !JOURNAL_STATUSES.includes(status as (typeof JOURNAL_STATUSES)[number])) {
    backWithError(base, 'Statut invalide.');
  }

  const supabase = await createClient();
  const { error } = await supabase.from('journal_accounts').update({ label, status }).eq('id', id);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${id}`);
  redirect(`${base}?saved=1`);
}

/** Paramètres — règles (compte personnalisé uniquement). Met à jour le snapshot. */
export async function saveAccountRules(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/app');
  const base = `/app/accounts/${id}/settings`;

  const supabase = await createClient();
  const { data: acc } = await supabase
    .from('journal_accounts')
    .select('offer_id, rules_snapshot')
    .eq('id', id)
    .single<{ offer_id: string | null; rules_snapshot: RulesSnapshot }>();
  if (!acc) redirect('/app');
  if (acc.offer_id) {
    backWithError(base, 'Les règles d’une offre du catalogue ne se modifient pas ici.');
  }

  const ddType = str(formData, 'drawdown_type');
  const ddAmount = num(formData, 'drawdown_amount');
  if (!ddType || !DRAWDOWN_TYPES.includes(ddType as DrawdownType)) {
    backWithError(base, 'Type de drawdown invalide.');
  }
  if (ddAmount === null || ddAmount <= 0) backWithError(base, 'Le montant de drawdown est obligatoire.');

  const rules: OfferRules = {
    ...acc.rules_snapshot.rules,
    drawdownType: ddType as DrawdownType,
    drawdownAmount: ddAmount,
    profitTarget: num(formData, 'profit_target'),
    dailyLossLimit: num(formData, 'daily_loss_limit'),
    consistencyPct: num(formData, 'consistency_pct'),
    minTradingDays: num(formData, 'min_trading_days') ?? 1,
  };
  const snapshot: RulesSnapshot = { ...acc.rules_snapshot, rules };

  const { error } = await supabase
    .from('journal_accounts')
    .update({ rules_snapshot: snapshot })
    .eq('id', id);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${id}`);
  redirect(`${base}?saved=1`);
}

/** Paramètres — commission par contrat aller-retour (+ back-fill optionnel). */
export async function saveAccountCommission(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/app');
  const base = `/app/accounts/${id}/settings`;

  const rateRaw = str(formData, 'commission_per_contract');
  let rate: number | null = null;
  if (rateRaw !== null) {
    const n = Number(rateRaw.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) backWithError(base, 'Commission invalide (nombre ≥ 0).');
    rate = n;
  }
  const applyExisting = formData.get('apply_existing') === 'on';

  const supabase = await createClient();
  const { error } = await supabase
    .from('journal_accounts')
    .update({ commission_per_contract: rate })
    .eq('id', id);
  if (error) backWithError(base, error.message);

  // Recalcule les frais des trades importés (source csv) selon le nouveau taux.
  if (applyExisting && rate !== null) {
    const { data: csvTrades } = await supabase
      .from('trades')
      .select('id, quantity')
      .eq('account_id', id)
      .eq('source', 'csv')
      .returns<{ id: string; quantity: number | null }[]>();
    for (const t of csvTrades ?? []) {
      await supabase.from('trades').update({ fees: feesForTrade(t.quantity, rate) }).eq('id', t.id);
    }
  }

  revalidatePath(`/app/accounts/${id}`);
  redirect(`${base}?saved=1`);
}

/* ---------- Bilan financier : achats (challenges/resets/activations) & payouts ---------- */

const PURCHASE_KINDS = ['challenge', 'reset', 'activation'] as const;

export async function addPurchase(formData: FormData) {
  const accountId = str(formData, 'account_id');
  if (!accountId) redirect('/app');
  const base = `/app/accounts/${accountId}/settings`;
  const kind = str(formData, 'kind');
  const amount = num(formData, 'amount');
  if (!kind || !PURCHASE_KINDS.includes(kind as (typeof PURCHASE_KINDS)[number])) {
    backWithError(base, 'Type d’achat invalide.');
  }
  if (amount === null || amount < 0) backWithError(base, 'Montant invalide.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const { data: acc } = await supabase
    .from('journal_accounts')
    .select('rules_snapshot')
    .eq('id', accountId)
    .single<{ rules_snapshot: RulesSnapshot }>();
  const currency = acc?.rules_snapshot.display?.currency ?? 'USD';

  const { error } = await supabase.from('account_purchases').insert({
    journal_account_id: accountId,
    user_id: user.id,
    kind,
    amount,
    currency,
    purchased_at: str(formData, 'purchased_at') ?? new Date().toISOString().slice(0, 10),
  });
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(`${base}?saved=1#couts`);
}

export async function deletePurchase(formData: FormData) {
  const id = str(formData, 'id');
  const accountId = str(formData, 'account_id');
  if (!id || !accountId) redirect('/app');
  const base = `/app/accounts/${accountId}/settings`;

  const supabase = await createClient();
  const { error } = await supabase.from('account_purchases').delete().eq('id', id);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(`${base}?saved=1#couts`);
}

export async function addPayout(formData: FormData) {
  const accountId = str(formData, 'account_id');
  if (!accountId) redirect('/app');
  const base = `/app/accounts/${accountId}/settings`;
  const amount = num(formData, 'amount');
  if (amount === null || amount <= 0) backWithError(base, 'Montant invalide.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const { error } = await supabase.from('journal_payouts').insert({
    account_id: accountId,
    user_id: user.id,
    amount,
    received_at: str(formData, 'received_at'),
  });
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(`${base}?saved=1#couts`);
}

export async function deletePayout(formData: FormData) {
  const id = str(formData, 'id');
  const accountId = str(formData, 'account_id');
  if (!id || !accountId) redirect('/app');
  const base = `/app/accounts/${accountId}/settings`;

  const supabase = await createClient();
  const { error } = await supabase.from('journal_payouts').delete().eq('id', id);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(`${base}?saved=1#couts`);
}

/** Suppression groupée d'entrées sélectionnées. RLS + scope compte : jamais hors de ses trades. */
export async function deleteTradesBulk(formData: FormData) {
  const accountId = str(formData, 'account_id');
  const ids = formData.getAll('ids').map((v) => String(v)).filter(Boolean);
  if (!accountId) redirect('/app');
  const base = `/app/accounts/${accountId}?view=historique`;
  if (ids.length === 0) redirect(base);

  const supabase = await createClient();
  // Vérifie l'appartenance du compte ; la policy RLS « trades owner » borne déjà
  // la suppression aux trades de l'utilisateur, on scope en plus par compte.
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id')
    .eq('id', accountId)
    .single<{ id: string }>();
  if (!account) redirect('/app');

  const { error } = await supabase.from('trades').delete().eq('account_id', accountId).in('id', ids);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(base);
}

/** Supprime un lot d'import entier (annuler un import faux ou en double). */
export async function deleteImportBatch(formData: FormData) {
  const accountId = str(formData, 'account_id');
  const batch = str(formData, 'import_batch');
  if (!accountId) redirect('/app');
  const base = `/app/accounts/${accountId}?view=historique`;
  if (!batch) redirect(base);

  const supabase = await createClient();
  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id')
    .eq('id', accountId)
    .single<{ id: string }>();
  if (!account) redirect('/app');

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('account_id', accountId)
    .eq('import_batch', batch);
  if (error) backWithError(base, error.message);

  revalidatePath(`/app/accounts/${accountId}`);
  redirect(base);
}

export async function deleteAccount(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/app');

  const supabase = await createClient();
  const { error } = await supabase.from('journal_accounts').delete().eq('id', id);
  if (error) backWithError(`/app/accounts/${id}`, error.message);

  revalidatePath('/app');
  redirect('/app');
}

/** Enregistre (upsert) la synthèse guidée d'une revue hebdomadaire. */
export async function saveReview(formData: FormData) {
  const accountId = str(formData, 'account_id');
  const weekStart = str(formData, 'week_start');
  if (!accountId || !weekStart) redirect('/app');
  const base = `/app/accounts/${accountId}/review?week=${weekStart}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  // Réponses libres — on ne garde que les champs connus, valeurs élaguées.
  const answers: Record<string, string> = {};
  for (const key of ['went_well', 'what_cost', 'next_focus']) {
    const v = str(formData, key);
    if (v) answers[key] = v.slice(0, 4000);
  }

  const { error } = await supabase.from('journal_reviews').upsert(
    {
      user_id: user.id,
      account_id: accountId,
      week_start: weekStart,
      answers,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,week_start' },
  );
  if (error) backWithError(base, error.message);

  revalidatePath(base);
  redirect(`${base}&saved=1`);
}
