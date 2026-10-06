import Link from 'next/link';
import { CalendarDays, Download, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buildMonthView, parseMonth } from '@/lib/journal/calendar';
import { pnlByDay } from '@/lib/rules/futures-engine';
import { computeMetrics, resolveRange, type AnalyticsTrade, type PeriodPreset } from '@/lib/journal/analytics';
import { toEngineTrade, type DbTradeRow, type RulesSnapshot } from '@/lib/journal/snapshot';
import EmptyState from '@/components/ui/EmptyState';
import { buttonClasses } from '@/components/ui/Button';
import { money, signed, pnlColor, stateColor } from '../_components/journal-ui';
import JournalCalendar from './JournalCalendar';
import JournalControls from './JournalControls';
import AddTradeModal from '../AddTradeModal';

export const metadata = { title: 'Journal de Trading — Tradegrape' };

interface AccountLite {
  id: string;
  label: string | null;
  rules_snapshot: RulesSnapshot;
}
interface JTrade extends DbTradeRow {
  account_id: string;
  symbol: string | null;
  direction: string | null;
  quantity: number | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
}

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DATE_FR.format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)));
}
function num(x: number | string | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (x === null || x === undefined || x === '') return '—';
  const n = Number(x);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', opts ?? { maximumFractionDigits: 2 });
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; period?: string; account?: string; month?: string }>;
}) {
  const { view, period: periodParam, account: accountParam, month: monthParam } = await searchParams;
  const activeView: 'list' | 'calendar' = view === 'calendar' ? 'calendar' : 'list';
  const account = accountParam ?? 'all';
  const period = (periodParam as PeriodPreset) ?? 'all';

  const supabase = await createClient();

  const { data: accountsData } = await supabase
    .from('journal_accounts')
    .select('id, label, rules_snapshot')
    .order('created_at', { ascending: false })
    .returns<AccountLite[]>();
  const accounts = accountsData ?? [];
  const accById = new Map(accounts.map((a) => [a.id, a]));
  const scopedIds = account === 'all' ? accounts.map((a) => a.id) : accounts.filter((a) => a.id === account).map((a) => a.id);

  let trades: JTrade[] = [];
  if (scopedIds.length > 0) {
    const { data } = await supabase
      .from('trades')
      .select('id, account_id, trade_date, closed_at, pnl, fees, symbol, direction, quantity, entry_price, exit_price')
      .in('account_id', scopedIds)
      .returns<JTrade[]>();
    trades = data ?? [];
  }

  // Devise d'affichage : commune si tous les comptes scoping la partagent, sinon USD + note.
  const scopedCurrencies = new Set(
    (account === 'all' ? accounts : accounts.filter((a) => a.id === account)).map(
      (a) => a.rules_snapshot?.display?.currency ?? 'USD',
    ),
  );
  const mixed = scopedCurrencies.size > 1;
  const currency = mixed ? 'USD' : [...scopedCurrencies][0] ?? 'USD';

  const controls = (
    <JournalControls
      view={activeView}
      period={period}
      account={account}
      accounts={accounts.map((a) => ({ id: a.id, label: a.label ?? 'Compte' }))}
    />
  );
  const addModal = (
    <AddTradeModal
      accounts={accounts.map((a) => ({ id: a.id, label: a.label ?? 'Compte', currency: a.rules_snapshot?.display?.currency ?? 'USD' }))}
      today={new Date().toISOString().slice(0, 10)}
    />
  );

  // ─────────────────────────────────────────── Vue Calendrier (reléguée, accessible)
  if (activeView === 'calendar') {
    const byDay = pnlByDay(trades.map(toEngineTrade));
    const countByDay = new Map<string, number>();
    for (const t of trades) countByDay.set(t.trade_date, (countByDay.get(t.trade_date) ?? 0) + 1);
    const now = new Date();
    const { year, month } = parseMonth(monthParam, { year: now.getUTCFullYear(), month: now.getUTCMonth() });
    const calView = buildMonthView({ year, month, pnlByDay: byDay, countByDay, dailyLossLimit: null, breakerDay: null });

    return (
      <main className="jwrap">
        <div className="acct-head">
          <div className="acct-head-title">
            <h1 className="jh1">Journal de Trading</h1>
            <p className="jsub">Le P&L de tous tes comptes, jour par jour.</p>
          </div>
          <div className="acct-toolbar">{controls}{addModal}</div>
        </div>
        {trades.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Ton journal est vide" description="Ajoute une entrée : elle apparaîtra ici, tous comptes réunis." />
        ) : (
          <JournalCalendar view={calView} basePath="/app/journal" />
        )}
        {mixed ? <p className="journal-note">Plusieurs devises — les montants sont additionnés sans conversion.</p> : null}
      </main>
    );
  }

  // ──────────────────────────────────────────────────────── Vue Liste (par défaut)
  const range = resolveRange(period, new Date().toISOString().slice(0, 10), []);
  const inRange = (d: string) => (period === 'all' ? true : d >= range.from && d <= range.to);
  const windowed = trades.filter((t) => inRange(t.trade_date));

  const aTrades: AnalyticsTrade[] = windowed.map((t) => ({ ...toEngineTrade(t), symbol: t.symbol ?? '', tags: [] }));
  const m = computeMetrics(aTrades);

  const rows = [...windowed].sort((a, b) => {
    const ka = a.closed_at ?? a.trade_date;
    const kb = b.closed_at ?? b.trade_date;
    return kb.localeCompare(ka);
  });

  const avgMax = Math.max(m.avgWin, m.avgLoss, 1);
  const pf = m.profitFactor === null ? (m.grossWin > 0 ? '∞' : '0.00') : m.profitFactor.toFixed(2);
  const exportHref = `/app/journal/export${account !== 'all' ? `?account=${account}` : ''}`;

  return (
    <main className="jwrap">
      <div className="acct-head">
        <div className="acct-head-title">
          <h1 className="jh1">Journal de Trading</h1>
          <p className="jsub">Tous tes trades, tous comptes réunis — filtrés par période et par compte.</p>
        </div>
        <div className="acct-toolbar">{controls}{addModal}</div>
      </div>

      {trades.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Ton journal est vide"
          description="Ajoute des entrées à un compte : elles apparaîtront ici, tous comptes réunis."
          action={<Link href="/app/accounts" className={buttonClasses({ variant: 'secondary' })}>Ouvrir un compte</Link>}
        />
      ) : (
        <>
          {/* ── Bandeau KPI ── */}
          <div className="jl-kpis">
            <div className="jl-kpi card">
              <div className="jl-kpi-h"><span className="jl-kpi-dot" />Net P&L</div>
              <div className="jl-kpi-v num" style={{ color: pnlColor(m.netPnl) }}>{signed(m.netPnl, currency)}</div>
              <div className="jl-kpi-sub">{m.entries} trade{m.entries > 1 ? 's' : ''}</div>
            </div>

            <div className="jl-kpi card">
              <div className="jl-kpi-h"><span className="jl-kpi-dot" />Profit factor</div>
              <div className="jl-kpi-v num">{pf}</div>
              <div className="jl-kpi-sub num">
                <span style={{ color: 'var(--lime)' }}>{money(m.grossWin, currency)}</span>
                {' / '}
                <span style={{ color: 'var(--red)' }}>{money(m.grossLoss, currency)}</span>
              </div>
            </div>

            <div className="jl-kpi card">
              <div className="jl-kpi-h"><span className="jl-kpi-dot" />Trade win %</div>
              <div className="jl-kpi-v num">{m.winRate === null ? '—' : `${m.winRate.toFixed(1)}%`}</div>
              <div className="jl-kpi-sub jl-wbl num">
                <span className="jl-w">{m.wins}W</span>
                <span className="jl-b">{m.breakeven}B</span>
                <span className="jl-l">{m.losses}L</span>
              </div>
            </div>

            <div className="jl-kpi card">
              <div className="jl-kpi-h"><span className="jl-kpi-dot" />Avg win / loss</div>
              <div className="jl-avg">
                <span className="jl-avg-l">Gain moyen</span>
                <span className="jl-avg-bar"><span style={{ width: `${(m.avgWin / avgMax) * 100}%`, background: 'var(--lime)' }} /></span>
                <span className="jl-avg-v num" style={{ color: 'var(--lime)' }}>+{num(m.avgWin)}</span>
              </div>
              <div className="jl-avg">
                <span className="jl-avg-l">Perte moyenne</span>
                <span className="jl-avg-bar"><span style={{ width: `${(m.avgLoss / avgMax) * 100}%`, background: 'var(--red)' }} /></span>
                <span className="jl-avg-v num" style={{ color: 'var(--red)' }}>−{num(m.avgLoss)}</span>
              </div>
            </div>
          </div>

          {/* ── Liste des trades ── */}
          <section className="jl-list card">
            <div className="jl-list-head">
              <h2 className="jl-list-t"><span className="jl-kpi-dot" />Liste des trades</h2>
              <a href={exportHref} className="jl-action" download>
                <Download size={15} aria-hidden="true" /> Exporter
              </a>
            </div>

            {rows.length === 0 ? (
              <div className="jl-empty">Aucun trade sur cette période.</div>
            ) : (
              <div className="jl-tablewrap">
                <table className="jl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbole</th>
                      <th className="jl-c-type">Type</th>
                      <th>Statut</th>
                      <th className="jl-c-acc">Compte</th>
                      <th className="jl-c-price num">Entrée</th>
                      <th className="jl-c-price num">Sortie</th>
                      <th className="jl-c-qty num">Qté</th>
                      <th className="jl-right">P&L</th>
                      <th className="jl-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const netv = Number(t.pnl) - Number(t.fees ?? 0);
                      const isDaily = !t.symbol || t.symbol === '';
                      const st = netv > 0 ? { label: 'Gagné', c: stateColor('ok') } : netv < 0 ? { label: 'Perdu', c: stateColor('danger') } : { label: 'Neutre', c: 'var(--ink3)' };
                      const dir = t.direction === 'long' ? 'Long' : t.direction === 'short' ? 'Short' : '—';
                      const acc = accById.get(t.account_id);
                      return (
                        <tr key={t.id}>
                          <td className="num">{fmtDay(t.trade_date)}</td>
                          <td>{isDaily ? <span className="jl-daily">Journalier</span> : <span className="jl-sym">{t.symbol}</span>}</td>
                          <td className="jl-c-type">{dir}</td>
                          <td><span className="jl-status" style={{ ['--sc' as string]: st.c }}><span className="jl-status-dot" />{st.label}</span></td>
                          <td className="jl-c-acc jl-acc">{acc?.label ?? 'Compte'}</td>
                          <td className="jl-c-price num">{num(t.entry_price)}</td>
                          <td className="jl-c-price num">{num(t.exit_price)}</td>
                          <td className="jl-c-qty num">{num(t.quantity, { maximumFractionDigits: 0 })}</td>
                          <td className="jl-right num" style={{ color: pnlColor(netv), fontWeight: 700 }}>{signed(netv, currency)}</td>
                          <td className="jl-right">
                            <Link href={`/app/accounts/${t.account_id}/trades/${t.id}`} className="jl-edit" aria-label="Modifier le trade">
                              <Pencil size={14} aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {mixed ? <p className="journal-note">Plusieurs devises parmi tes comptes — les montants sont additionnés sans conversion.</p> : null}
        </>
      )}
    </main>
  );
}
