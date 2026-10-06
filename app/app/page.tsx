import Link from 'next/link';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { evaluateAccount, pnlByDay } from '@/lib/rules/futures-engine';
import { rulesForStatus } from '@/lib/rules/phase';
import { toEngineTrade, type DbTradeRow, type RulesSnapshot } from '@/lib/journal/snapshot';
import {
  buildAggregateAnalytics,
  resolveRange,
  type AggregateTrade,
  type PeriodPreset,
} from '@/lib/journal/analytics';
import { buildMonthView, parseMonth } from '@/lib/journal/calendar';
import { computeDiscipline } from '@/lib/journal/discipline';
import { buttonClasses } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { money, signed, pnlColor, StatusBadge, stateColor } from './_components/journal-ui';
import DashPeriodFilter from './DashPeriodFilter';
import AddTradeModal from './AddTradeModal';
import CumulativeChart from './analytics/CumulativeChart';
import JournalCalendar from './journal/JournalCalendar';
import MarketHours from './MarketHours';
import DashAccountFilter from './DashAccountFilter';

export const metadata = { title: 'Tableau de bord — Tradegrape' };

function discColor(s: number): string {
  if (s >= 70) return 'var(--lime)';
  if (s >= 50) return 'var(--amber)';
  return 'var(--red)';
}
function discLabel(s: number): string {
  if (s >= 85) return 'Excellent';
  if (s >= 70) return 'Solide';
  if (s >= 50) return 'À surveiller';
  return 'Fragile';
}

const PERIODS: PeriodPreset[] = ['month', 'quarter', 'all', 'custom'];

interface AccountRow {
  id: string;
  label: string | null;
  account_size: number;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
  rules_changed_at: string | null;
  rules_ack_at: string | null;
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
interface ReviewRow {
  id: string;
  account_id: string;
  week_start: string;
  answers: Record<string, string> | null;
}

const WEEK_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
function weekLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEK_FMT.format(new Date(y, m - 1, d));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; month?: string; account?: string }>;
}) {
  const { period: periodParam, from: fromParam, to: toParam, month: monthParam, account: accountRaw } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: accountsData }, { data: tradesData }, { data: reviewsData }] = await Promise.all([
    supabase
      .from('journal_accounts')
      .select('id, label, account_size, starting_balance, status, rules_snapshot, rules_changed_at, rules_ack_at')
      .order('created_at', { ascending: false })
      .returns<AccountRow[]>(),
    supabase.from('trades').select('id, account_id, trade_date, closed_at, pnl, fees, symbol, tags').returns<TradeRow[]>(),
    supabase.from('journal_reviews').select('id, account_id, week_start, answers').order('week_start', { ascending: false }).limit(3).returns<ReviewRow[]>(),
  ]);

  const accounts = accountsData ?? [];
  const tradeRows = tradesData ?? [];
  const reviews = reviewsData ?? [];
  const labels = new Map(accounts.map((a) => [a.id, a.label ?? 'Compte']));
  const currency = accounts[0]?.rules_snapshot?.display?.currency ?? 'USD';
  const currencies = new Set(accounts.map((a) => a.rules_snapshot?.display?.currency ?? 'USD'));

  // Filtre « Tous les comptes ▾ » : tout le dashboard se restreint au compte choisi.
  const accountParam = accounts.some((a) => a.id === accountRaw) ? (accountRaw as string) : 'all';
  const fAccounts = accountParam === 'all' ? accounts : accounts.filter((a) => a.id === accountParam);
  const fTrades = accountParam === 'all' ? tradeRows : tradeRows.filter((t) => t.account_id === accountParam);
  const fReviews = accountParam === 'all' ? reviews : reviews.filter((r) => r.account_id === accountParam);

  // Trades regroupés par compte (pour l'état/jauges de chaque compte).
  const tradesByAccount = new Map<string, DbTradeRow[]>();
  for (const t of fTrades) {
    const list = tradesByAccount.get(t.account_id) ?? [];
    list.push(t);
    tradesByAccount.set(t.account_id, list);
  }

  const rows = fAccounts.map((a) => {
    const snap = a.rules_snapshot;
    const trades = (tradesByAccount.get(a.id) ?? []).map(toEngineTrade);
    const resolved = rulesForStatus(snap.rules, a.status);
    const evalr = evaluateAccount(resolved, Number(a.starting_balance), trades);
    const disc = computeDiscipline(resolved, Number(a.starting_balance), trades);
    return { a, snap, evalr, disc };
  });

  const totTrading = rows.reduce((s, r) => s + r.disc.tradingDays, 0);
  const totDisc = rows.reduce((s, r) => s + r.disc.disciplinedDays, 0);
  const overallDisc = totTrading > 0 ? Math.round((totDisc / totTrading) * 100) : null;

  // Analytics agrégées sur la période (KPI + courbe).
  const allTrades: AggregateTrade[] = fTrades.map((r) => ({
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
  const agg = buildAggregateAnalytics({ allTrades, range });
  const m = agg.metrics;

  // Calendrier agrégé (navigation de mois indépendante de la période).
  const byDay = pnlByDay(fTrades.map(toEngineTrade));
  const countByDay = new Map<string, number>();
  for (const t of fTrades) countByDay.set(t.trade_date, (countByDay.get(t.trade_date) ?? 0) + 1);
  const now = new Date();
  // Par défaut, on ouvre le calendrier sur le mois de la DERNIÈRE activité
  // (sinon le mois courant, souvent vide, domine l'écran pour rien).
  const latestTradeDate = fTrades.reduce((mx, t) => (t.trade_date > mx ? t.trade_date : mx), '');
  const monthFallback = latestTradeDate
    ? { year: Number(latestTradeDate.slice(0, 4)), month: Number(latestTradeDate.slice(5, 7)) - 1 }
    : { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  const { year, month } = parseMonth(monthParam, monthFallback);
  const calView = buildMonthView({ year, month, pnlByDay: byDay, countByDay, dailyLossLimit: null, breakerDay: null });
  const monthTotal = calView.weeks.reduce((s, w) => s + w.total, 0);

  const alerts = fAccounts.filter((a) => a.rules_changed_at && (!a.rules_ack_at || a.rules_ack_at < a.rules_changed_at));

  if (accounts.length === 0) {
    return (
      <main className="jwrap">
        <div className="jhead">
          <div>
            <h1 className="jh1">Tableau de bord</h1>
            <p className="jsub">Ton cockpit : performance, calendrier et état de tes comptes en un coup d’œil.</p>
          </div>
        </div>
        <EmptyState
          icon={AlertTriangle}
          title="Bienvenue dans ton journal"
          description="Ajoute un premier compte (offre du comparateur ou ta firm) et ce tableau de bord se remplira : KPI, calendrier, courbe de P&L et état de tes comptes."
          action={<Link href="/app/accounts/new" className={buttonClasses()}>Ajouter mon premier compte</Link>}
        />
      </main>
    );
  }

  return (
    <main className="jwrap">
      <div className="dash-top">
        <div className="dash-top-title">
          <h1 className="jh1">Tableau de bord</h1>
          <span className="dash-live"><span className="dash-live-dot" />Live</span>
        </div>
        <div className="dash-top-actions">
          <DashAccountFilter accounts={accounts.map((a) => ({ id: a.id, label: a.label ?? 'Compte' }))} value={accountParam} />
          <DashPeriodFilter value={range.preset} />
          <AddTradeModal
            accounts={accounts.map((a) => ({ id: a.id, label: a.label ?? 'Compte', currency: a.rules_snapshot?.display?.currency ?? 'USD' }))}
            today={today}
          />
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="dash-alerts card">
          <AlertTriangle aria-hidden="true" />
          <div className="dash-alerts-body">
            <div className="dash-alerts-title">Règles modifiées à revoir</div>
            <div className="dash-alerts-txt">
              {alerts.length} compte{alerts.length > 1 ? 's' : ''} dont les règles ont changé :{' '}
              {alerts.map((a, i) => (
                <span key={a.id}>
                  {i > 0 ? ', ' : ''}
                  <Link href={`/app/accounts/${a.id}`} className="link-accent">{a.label ?? 'Compte'}</Link>
                </span>
              ))}
              .
            </div>
          </div>
        </div>
      ) : null}

      {currencies.size > 1 ? (
        <p className="journal-note">Devises mixtes ({[...currencies].join(', ')}) — les montants agrégés sont additionnés sans conversion.</p>
      ) : null}

      {/* KPI ---------------------------------------------------------------- */}
      <div className="kpi-row">
        <div className="kpi card">
          <div className="kpi-l">P&L net</div>
          <div className="kpi-k num" style={{ color: pnlColor(m.netPnl) }}>{signed(m.netPnl, currency)}</div>
          <div className="kpi-sub">{m.entries} entrée{m.entries > 1 ? 's' : ''}</div>
        </div>
        <div className="kpi card">
          <div className="kpi-l">Facteur de profit</div>
          <div className="kpi-k num">{m.profitFactor != null ? m.profitFactor.toFixed(2) : '—'}</div>
          <div className="kpi-sub num">{money(m.grossWin, currency)} / {money(m.grossLoss, currency)}</div>
        </div>
        <div className="kpi card">
          <div className="kpi-l">Gain / perte moyens</div>
          <div className="kpi-avg">
            <span className="kpi-avg-row"><span className="kpi-avg-tag" style={{ color: 'var(--lime)' }}>Gain</span><span className="num" style={{ color: 'var(--lime)' }}>{money(m.avgWin, currency)}</span></span>
            <span className="kpi-avg-row"><span className="kpi-avg-tag" style={{ color: 'var(--red)' }}>Perte</span><span className="num" style={{ color: 'var(--red)' }}>{money(m.avgLoss, currency)}</span></span>
          </div>
        </div>
        <div className="kpi card">
          <div className="kpi-l">Taux de réussite</div>
          <div className="kpi-k num">{m.winRate != null ? `${m.winRate}%` : '—'}</div>
          <div className="kpi-sub num">{m.wins}G · {m.breakeven}N · {m.losses}P</div>
        </div>
      </div>

      {/* Calendrier + courbe ----------------------------------------------- */}
      <div className="dash-grid2">
        <div className="dash-main">
          <div className="dash-cal">
            <JournalCalendar view={calView} basePath="/app" total={monthTotal} />
          </div>

          <section className="card dash-tablecard">
            <div className="dash-sec-head">
              <h2 className="dash-sec-title">Comptes de trading</h2>
              <Link href="/app/accounts" className="link-accent dash-sec-link">Voir tout</Link>
            </div>
            <div className="dash-table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Prop firm</th>
                    <th>Statut</th>
                    <th className="ta-r">Balance</th>
                    <th className="ta-r">P&L net</th>
                    <th className="ta-r">Objectif</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ a, snap, evalr }) => (
                    <tr key={a.id}>
                      <td><Link href={`/app/accounts/${a.id}`} className="dash-td-link">{a.label ?? 'Compte'}</Link></td>
                      <td className="dash-td-muted">{snap.display?.firmName} · {snap.display?.planName}</td>
                      <td><StatusBadge state={evalr.status} /></td>
                      <td className="ta-r num">{money(evalr.balance, currency)}</td>
                      <td className="ta-r num" style={{ color: pnlColor(evalr.netProfit) }}>{signed(evalr.netProfit, currency)}</td>
                      <td className="ta-r">
                        {evalr.profitTarget ? (
                          <span className="dash-obj">
                            <span className="dash-obj-bar"><span style={{ width: `${Math.round(evalr.profitTarget.ratio * 100)}%`, background: stateColor(evalr.profitTarget.state) }} /></span>
                            <span className="num">{Math.round(evalr.profitTarget.ratio * 100)}%</span>
                          </span>
                        ) : (
                          <span className="num dash-td-muted">{evalr.tradingDays.count}/{evalr.tradingDays.required} j</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {fReviews.length > 0 ? (
            <section className="dash-sessions">
              <div className="dash-sec-head">
                <h2 className="dash-sec-title">Dernières revues</h2>
                <Link href="/app/sessions" className="link-accent dash-sec-link">Voir tout</Link>
              </div>
              <div className="dash-sess-list">
                {fReviews.map((r) => {
                  const ans = r.answers ?? {};
                  const snippet = ans.went_well || ans.what_cost || ans.next_focus || 'Revue à compléter.';
                  return (
                    <Link key={r.id} href={`/app/accounts/${r.account_id}/review?week=${r.week_start}`} className="dash-sess card card-interactive">
                      <div className="dash-sess-head">
                        <ClipboardCheck aria-hidden="true" />
                        <span className="dash-sess-week">Semaine du {weekLabel(r.week_start)}</span>
                        <span className="dash-sess-acc">{labels.get(r.account_id)}</span>
                      </div>
                      <p className="dash-sess-snippet">{snippet}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="dash-side">
          <div className="card dash-curve">
            <div className="dash-sec-head">
              <h2 className="dash-sec-title">P&L net cumulé</h2>
              <Link href="/app/analytics" className="link-accent dash-sec-link">Analytics</Link>
            </div>
            {agg.rangeEntries === 0 ? (
              <p className="dash-empty-inline">Aucune entrée sur cette période.</p>
            ) : (
              <CumulativeChart points={agg.cumulative} currency={currency} />
            )}
          </div>

          <div className="card dash-disc-w">
            <div className="dash-sec-head">
              <h2 className="dash-sec-title">Discipline</h2>
              <Link href="/app/discipline" className="link-accent dash-sec-link">Détail</Link>
            </div>
            {overallDisc !== null ? (
              <div className="dash-disc-body">
                <div className="dash-disc-top">
                  <span className="dash-disc-num num" style={{ color: discColor(overallDisc) }}>
                    {overallDisc}<small>/100</small>
                  </span>
                  <span className="dash-disc-grade" style={{ color: discColor(overallDisc) }}>{discLabel(overallDisc)}</span>
                </div>
                <span className="dash-disc-bar"><span style={{ width: `${overallDisc}%`, background: discColor(overallDisc) }} /></span>
                <span className="dash-disc-sub"><span className="num">{totDisc}</span>/<span className="num">{totTrading}</span> journées disciplinées</span>
              </div>
            ) : (
              <p className="dash-empty-inline">Pas encore de journée à noter.</p>
            )}
          </div>

          <MarketHours />
        </div>
      </div>
    </main>
  );
}
