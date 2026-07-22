import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { RulesSnapshot } from '@/lib/journal/snapshot';
import {
  buildAggregateAnalytics,
  resolveRange,
  type AggregateTrade,
  type PeriodPreset,
} from '@/lib/journal/analytics';
import { Breakdown, DistributionBars, MetricsGrid } from '@/app/app/_components/analytics-ui';
import AnalyticsControls from '@/app/app/accounts/[id]/AnalyticsControls';
import AccountPicker from './AccountPicker';
import CumulativeChart from './CumulativeChart';

export const metadata = { title: 'Analytics — tous les comptes — Tradegrape' };

const PERIODS: PeriodPreset[] = ['month', 'quarter', 'all', 'custom'];

interface AccountRow {
  id: string;
  label: string | null;
  rules_snapshot: RulesSnapshot;
}
interface TradeRow {
  id: string;
  account_id: string;
  trade_date: string;
  closed_at: string;
  pnl: number | string;
  fees: number | string | null;
  symbol: string | null;
  tags: string[] | null;
}

export default async function AggregateAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period: periodParam, from: fromParam, to: toParam } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: accountsData }, { data: tradesData }] = await Promise.all([
    supabase.from('journal_accounts').select('id, label, rules_snapshot').order('created_at', { ascending: true }).returns<AccountRow[]>(),
    supabase.from('trades').select('id, account_id, trade_date, closed_at, pnl, fees, symbol, tags').returns<TradeRow[]>(),
  ]);

  const accounts = accountsData ?? [];
  const labels = new Map(accounts.map((a) => [a.id, a.label ?? 'Compte']));
  const currencies = new Set(accounts.map((a) => a.rules_snapshot.display?.currency ?? 'USD'));
  const currency = accounts[0]?.rules_snapshot.display?.currency ?? 'USD';

  const allTrades: AggregateTrade[] = (tradesData ?? []).map((r) => ({
    id: r.id,
    tradeDate: r.trade_date,
    closedAt: r.closed_at,
    pnl: Number(r.pnl),
    fees: r.fees === null ? 0 : Number(r.fees),
    symbol: r.symbol ?? '',
    tags: r.tags ?? [],
    accountId: r.account_id,
    accountLabel: labels.get(r.account_id) ?? 'Compte',
  }));

  const preset: PeriodPreset = PERIODS.includes(periodParam as PeriodPreset) ? (periodParam as PeriodPreset) : 'all';
  const range = resolveRange(preset, today, allTrades, fromParam, toParam);
  const a = buildAggregateAnalytics({ allTrades, range });

  return (
    <main className="jwrap jwrap-acct">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">Mes comptes</Link>{' / '}Analytics
      </nav>
      <div className="acct2-top">
        <div className="acct2-top-row">
          <h1 className="jh1">Analytics — tous les comptes</h1>
        </div>
        <p className="jsub">
          Performance consolidée sur {a.accounts} compte(s). ⚠️ Les jauges de règles restent par
          compte (chaque offre a ses règles) — ici, seules les analytics s’agrègent, donc pas de
          plancher de drawdown : la courbe est le P&L net cumulé.
        </p>
      </div>

      {currencies.size > 1 ? (
        <div className="notice notice-warn mt-4">
          Tes comptes mélangent plusieurs devises ({[...currencies].join(', ')}). Les montants agrégés
          sont affichés en {currency} sans conversion — à interpréter avec prudence.
        </div>
      ) : null}

      <div className="acct2-analytics mt-6">
        <div className="agg-controls">
          <AccountPicker accounts={accounts.map((x) => ({ id: x.id, label: x.label ?? 'Compte' }))} value="all" />
          <AnalyticsControls
            basePath="/app/analytics"
            preset={a.range.preset}
            from={a.range.from}
            to={a.range.to}
          />
        </div>

        {accounts.length === 0 ? (
          <div className="card acct2-empty">Aucun compte. <Link href="/app/accounts/new" className="link-accent">Ajoute-en un</Link>.</div>
        ) : a.rangeEntries === 0 ? (
          <div className="card acct2-empty">Aucune entrée sur cette période.</div>
        ) : (
          <>
            <div className="card">
              <h3 className="acct-rules-title">Métriques consolidées · {a.rangeEntries} entrée(s)</h3>
              <MetricsGrid metrics={a.metrics} currency={currency} />
            </div>

            <div className="card">
              <h3 className="acct-rules-title">P&L net cumulé (tous comptes)</h3>
              <CumulativeChart points={a.cumulative} currency={currency} />
            </div>

            <div className="card">
              <h3 className="acct-rules-title">Distribution du P&L</h3>
              <DistributionBars bins={a.distribution} />
            </div>

            <div className="acct2-breakdowns">
              <Breakdown title="Par compte" buckets={a.byAccount} currency={currency} catHeader="Compte" emptyHint="Aucune entrée." />
              <Breakdown title="Par symbole" buckets={a.bySymbol} currency={currency} catHeader="Symbole" emptyHint="Aucun trade détaillé (entrées journalières exclues)." />
              <Breakdown title="Par jour de la semaine" buckets={a.byWeekday} currency={currency} catHeader="Jour" emptyHint="Aucune entrée." />
              <Breakdown title="Par heure" buckets={a.byHour} currency={currency} catHeader="Heure" emptyHint="Aucun trade détaillé horodaté." />
              <Breakdown title="Par setup" buckets={a.bySetup} currency={currency} catHeader="Setup" emptyHint="Aucun tag de setup." />
              <Breakdown title="Par émotion" buckets={a.byEmotion} currency={currency} catHeader="Émotion" emptyHint="Aucun tag d'émotion." />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
