'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { num, str } from '@/lib/admin/form';
import {
  buildManualSnapshot,
  buildRulesSnapshot,
  type OfferRuleRow,
} from '@/lib/journal/snapshot';
import type { DrawdownType, OfferRules } from '@/lib/rules/types';

const DRAWDOWN_TYPES: DrawdownType[] = ['EOD', 'TRAIL', 'STATIC'];

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
  return {
    symbol: detailed ? str(formData, 'symbol') ?? '' : '',
    direction: detailed ? str(formData, 'direction') : null,
    quantity: detailed ? num(formData, 'quantity') : null,
    entry_price: detailed ? num(formData, 'entry_price') : null,
    exit_price: detailed ? num(formData, 'exit_price') : null,
    pnl,
    fees: num(formData, 'fees') ?? 0,
    closed_at: `${date}T12:00:00.000Z`,
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
    .select(OFFER_COLS)
    .eq('id', offerId)
    .single<OfferRuleRow & { plan_id: string }>();
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
  redirect(base);
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
  redirect(base);
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

export async function deleteAccount(formData: FormData) {
  const id = str(formData, 'id');
  if (!id) redirect('/app');

  const supabase = await createClient();
  const { error } = await supabase.from('journal_accounts').delete().eq('id', id);
  if (error) backWithError(`/app/accounts/${id}`, error.message);

  revalidatePath('/app');
  redirect('/app');
}
