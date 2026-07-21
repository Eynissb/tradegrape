import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { evaluateAccount, evaluatePayout, pnlByDay } from '@/lib/rules/futures-engine';
import {
  BLOCKER_LABELS,
  REASON_LABELS,
  toEngineTrade,
  type DbTradeRow,
  type RulesSnapshot,
} from '@/lib/journal/snapshot';
import {
  Banknote,
  CalendarCheck,
  CircleCheck,
  Gauge,
  Settings,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { buildMonthView, monthKey, parseMonth } from '@/lib/journal/calendar';
import { tagLabel } from '@/lib/journal/tags';
import type { RuleState } from '@/lib/rules/types';
import {
  money,
  pnlColor,
  signed,
  stateColor,
  StatusBadge,
} from '@/app/app/_components/journal-ui';
import Badge from '@/components/ui/Badge';
import Button, { buttonClasses } from '@/components/ui/Button';
import CardTitle from '@/components/ui/CardTitle';
import RuleBlock, { type RuleTone } from '@/components/ui/RuleBlock';
import { deleteTrade } from '@/app/app/actions';
import { buildAnalytics, resolveRange, type AnalyticsTrade, type PeriodPreset } from '@/lib/journal/analytics';
import EntryForms from './EntryForms';
import MonthCalendar from './MonthCalendar';
import AccountViewTabs from './AccountViewTabs';
import AnalyticsPanel from './AnalyticsPanel';
import HistoryPanel, { type HistoryRow } from './HistoryPanel';
import { Stat } from '@/app/app/_components/analytics-ui';
import { CalendarDays, TrendingDown, Hash, Percent, Flame } from 'lucide-react';

type AccountView = 'calendrier' | 'analytics' | 'historique';

const PERIODS: PeriodPreset[] = ['month', 'quarter', 'all', 'custom'];

export const metadata = { title: 'Compte — Tradegrape' };

/** État moteur → badge de règle (pastille + point coloré + libellé). */
function stateBadge(state: RuleState): { tone: RuleTone; label: string } {
  switch (state) {
    case 'passed': return { tone: 'ok', label: 'Atteint' };
    case 'warning': return { tone: 'warn', label: 'Attention' };
    case 'danger': return { tone: 'danger', label: 'Zone rouge' };
    case 'failed': return { tone: 'danger', label: 'Perdu' };
    default: return { tone: 'ok', label: 'OK' };
  }
}

interface AccountRow {
  id: string;
  label: string | null;
  account_size: number;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
  commission_per_contract: number | null;
}

interface TradeListRow extends DbTradeRow {
  symbol: string;
  direction: string | null;
  tags: string[];
  notes: string | null;
  source: string;
  import_batch: string | null;
  import_platform: string | null;
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    month?: string;
    day?: string;
    view?: string;
    highlight?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { id } = await params;
  const {
    error,
    month: monthParam,
    day: dayParam,
    view: viewParam,
    highlight: highlightParam,
    period: periodParam,
    from: fromParam,
    to: toParam,
  } = await searchParams;
  const view: AccountView =
    viewParam === 'historique' ? 'historique' : viewParam === 'analytics' ? 'analytics' : 'calendrier';
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, account_size, starting_balance, status, rules_snapshot, commission_per_contract')
    .eq('id', id)
    .single<AccountRow>();

  if (!account) notFound();

  const { data: tradeRows } = await supabase
    .from('trades')
    .select('id, trade_date, closed_at, pnl, fees, symbol, direction, tags, notes, source, import_batch, import_platform')
    .eq('account_id', id)
    .order('trade_date', { ascending: false })
    .order('closed_at', { ascending: false })
    .returns<TradeListRow[]>();

  const trades = tradeRows ?? [];
  const snap = account.rules_snapshot;
  const currency = snap.display?.currency ?? 'USD';
  const start = Number(account.starting_balance);

  const engineTrades = trades.map(toEngineTrade);
  const ev = evaluateAccount(snap.rules, start, engineTrades, today);
  const payout = evaluatePayout(snap.payout, start, ev.balance, engineTrades);

  // ---------- Données du calendrier ----------
  const dayPnl = pnlByDay(engineTrades);
  const countByDay = new Map<string, number>();
  for (const t of trades) {
    countByDay.set(t.trade_date, (countByDay.get(t.trade_date) ?? 0) + 1);
  }

  // Jour responsable de la rupture de cohérence : le jour gagnant le plus lourd.
  let breakerDay: string | null = null;
  let consistencyInfo: { date: string; sharePct: number; limitPct: number } | null = null;
  if (ev.consistency && ev.consistency.state === 'warning') {
    let best = 0;
    for (const [d, pnl] of dayPnl) {
      if (pnl > best) {
        best = pnl;
        breakerDay = d;
      }
    }
    if (breakerDay) {
      consistencyInfo = {
        date: breakerDay,
        sharePct: ev.consistency.value,
        limitPct: ev.consistency.limit,
      };
    }
  }

  const latestDay = trades[0]?.trade_date ?? today;
  const { year, month } = parseMonth(monthParam, {
    year: Number(latestDay.slice(0, 4)),
    month: Number(latestDay.slice(5, 7)) - 1,
  });
  const monthView = buildMonthView({
    year,
    month,
    pnlByDay: dayPnl,
    countByDay,
    dailyLossLimit: snap.rules.dailyLossLimit,
    breakerDay,
  });

  // Détail d'un jour cliqué dans le calendrier (panneau compagnon).
  const dayTrades = dayParam ? trades.filter((t) => t.trade_date === dayParam) : [];

  // Récap du mois affiché (bandeau sous le calendrier quand aucun jour cliqué).
  const monthCells = monthView.weeks.flatMap((w) => w.days).filter((d) => d.inMonth);
  const monthTotal = monthCells.reduce((s, d) => s + (d.pnl ?? 0), 0);
  const monthActiveDays = monthCells.filter((d) => d.pnl !== null).length;
  const monthTradingDays = monthCells.filter((d) => d.isTradingDay).length;

  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  for (const d of monthCells) {
    if (d.pnl === null) continue;
    if (!bestDay || d.pnl > bestDay.pnl) bestDay = { date: d.date, pnl: d.pnl };
    if (!worstDay || d.pnl < worstDay.pnl) worstDay = { date: d.date, pnl: d.pnl };
  }

  // Série en cours : jours consécutifs de même signe depuis le jour le plus récent.
  const orderedDays = [...dayPnl.keys()].sort().reverse();
  let streak = 0;
  let streakSign = 0;
  for (const d of orderedDays) {
    const p = dayPnl.get(d) ?? 0;
    const s = p > 0 ? 1 : p < 0 ? -1 : 0;
    if (streakSign === 0) {
      if (s === 0) break;
      streakSign = s;
      streak = 1;
    } else if (s === streakSign) {
      streak += 1;
    } else {
      break;
    }
  }
  const streakLabel =
    streak === 0
      ? '—'
      : `${streak} jour${streak > 1 ? 's' : ''} ${streakSign > 0 ? 'gagnant' : 'perdant'}${streak > 1 ? 's' : ''}`;

  // Dernières entrées, montrées sous le calendrier (vérifier sans changer d'onglet).
  const recentTrades = trades.slice(0, 8);

  // Lignes sérialisables pour le panneau d'historique (client : sélection + filtres).
  const historyRows: HistoryRow[] = trades.map((t) => ({
    id: t.id,
    trade_date: t.trade_date,
    symbol: t.symbol,
    direction: t.direction,
    pnl: Number(t.pnl),
    fees: t.fees === null ? 0 : Number(t.fees),
    tags: t.tags,
    source: t.source,
    import_batch: t.import_batch,
    import_platform: t.import_platform,
  }));

  // Totaux tous comptes confondus — en-tête de l'onglet Historique.
  let winCount = 0;
  let lossCount = 0;
  for (const t of trades) {
    const p = Number(t.pnl) - (t.fees === null ? 0 : Number(t.fees));
    if (p > 0) winCount += 1;
    else if (p < 0) lossCount += 1;
  }
  const decidedCount = winCount + lossCount;
  const winRate = decidedCount ? Math.round((winCount / decidedCount) * 100) : null;

  // Commissions non renseignées alors qu'il y a des trades importés → P&L surestimé.
  const importedCount = trades.filter((t) => t.source === 'csv').length;
  const commissionsMissing = account.commission_per_contract == null && importedCount > 0;

  // Analytics (onglet dédié) — recalculées selon la période sélectionnée.
  const preset: PeriodPreset = PERIODS.includes(periodParam as PeriodPreset)
    ? (periodParam as PeriodPreset)
    : 'all';
  const analyticsTrades: AnalyticsTrade[] = trades.map((t) => ({
    ...toEngineTrade(t),
    symbol: t.symbol ?? '',
    tags: t.tags,
  }));
  const range = resolveRange(preset, today, analyticsTrades, fromParam, toParam);
  const analytics =
    view === 'analytics'
      ? buildAnalytics({ rules: snap.rules, startingBalance: start, allTrades: analyticsTrades, range })
      : null;

  return (
    <main className="jwrap jwrap-acct dash">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">
          Mes comptes
        </Link>{' '}
        / {account.label ?? 'Compte'}
      </nav>

      <div className="acct2-top">
        <div className="acct2-top-row">
          <h1 className="jh1">{account.label ?? 'Compte'}</h1>
          <Link href={`/app/accounts/${account.id}/settings`} className="jsettings-link">
            <Settings aria-hidden="true" /> Réglages du compte
          </Link>
        </div>
        <p className="jsub">
          {snap.display?.firmName} · {snap.display?.planName} ·{' '}
          {money(Number(account.account_size), currency)}
        </p>
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      {ev.reasons.length > 0 ? (
        <div className="notice notice-error mt-4">
          {ev.reasons.map((r) => REASON_LABELS[r] ?? r).join(' · ')}
        </div>
      ) : null}

      {commissionsMissing ? (
        <div className="notice notice-warn mt-4">
          Les commissions ne sont pas prises en compte sur ce compte ({importedCount} trade(s) importé(s)) :
          le P&L et la progression vers l’objectif sont <strong>surestimés</strong>.{' '}
          <Link href={`/app/accounts/${account.id}/settings#commissions`} className="link-accent">Renseigner les commissions</Link>
        </div>
      ) : null}

      <div className={`acct2 mt-6${view === 'historique' ? ' acct2-stretch' : ''}`}>
        {/* Console gauche : état/règles + payout + saisie — toujours visibles */}
        <aside className="acct2-console">
          {/* Solde du compte */}
          <div className="card acct2-cockpit">
            <CardTitle icon={Wallet} right={<StatusBadge state={ev.status} />}>Solde du compte</CardTitle>
            <div className="acct2-balance">
              <div className="jbalance num">{money(ev.balance, currency)}</div>
              <div className="jbalance-sub num" style={{ color: pnlColor(ev.netProfit) }}>{signed(ev.netProfit, currency)}</div>
            </div>
          </div>

          {/* Règles en temps réel — façon Goal Overview (colonnes requis / actuel) */}
          <div className="card">
            <CardTitle icon={Gauge}>Règles en temps réel</CardTitle>
            <div className="rule-blocks">
              {ev.dailyLoss ? (
                <RuleBlock
                  icon={Shield}
                  title="Perte journalière"
                  badge={stateBadge(ev.dailyLoss.state)}
                  cols={[
                    { label: 'Limite', value: money(ev.dailyLoss.limit, currency) },
                    { label: 'Restant', value: money(ev.dailyLoss.value, currency), color: ev.dailyLoss.state === 'ok' ? undefined : stateColor(ev.dailyLoss.state) },
                  ]}
                />
              ) : null}

              <RuleBlock
                icon={Shield}
                title="Marge avant plancher"
                badge={stateBadge(ev.drawdown.state)}
                cols={[
                  { label: 'Plancher', value: money(ev.drawdownFloor, currency) },
                  { label: 'Marge restante', value: money(ev.drawdown.value, currency), color: ev.drawdown.state === 'ok' ? undefined : stateColor(ev.drawdown.state) },
                ]}
              />

              {ev.profitTarget ? (
                <RuleBlock
                  icon={Target}
                  title="Objectif de profit"
                  badge={ev.profitTarget.state === 'passed' ? { tone: 'ok', label: 'Atteint' } : { tone: 'brand', label: 'En cours' }}
                  cols={[
                    { label: 'Requis', value: money(ev.profitTarget.limit, currency) },
                    { label: 'Actuel', value: money(ev.profitTarget.value, currency) },
                  ]}
                />
              ) : null}

              {ev.consistency ? (
                <RuleBlock
                  icon={TrendingUp}
                  title="Cohérence"
                  badge={ev.consistency.state === 'ok' ? { tone: 'ok', label: 'OK' } : { tone: 'warn', label: 'Attention' }}
                  cols={[
                    { label: 'Max autorisé', value: `${ev.consistency.limit}%` },
                    { label: 'Meilleur jour', value: `${ev.consistency.value}%`, color: ev.consistency.state === 'ok' ? undefined : 'var(--warn)' },
                  ]}
                />
              ) : null}

              <RuleBlock
                icon={CalendarCheck}
                title="Jours de trading"
                badge={ev.tradingDays.met ? { tone: 'ok', label: 'OK' } : { tone: 'warn', label: 'En cours' }}
                cols={[
                  { label: 'Minimum', value: String(ev.tradingDays.required) },
                  { label: 'Validés', value: String(ev.tradingDays.count), color: ev.tradingDays.met ? 'var(--ok)' : undefined },
                ]}
              />
            </div>
          </div>

          {/* Payout — bloc en dégradé, notre signature produit */}
          <div className="card card-grad acct2-payout">
              <CardTitle
                icon={Banknote}
                right={
                  <Badge variant={payout.eligible ? 'ok' : 'warn'} icon={payout.eligible ? CircleCheck : TriangleAlert}>
                    {payout.eligible ? 'Éligible' : 'Pas encore'}
                  </Badge>
                }
              >
                Retrait — compte financé
              </CardTitle>

              <div className="jpayout-figs">
                <div>
                  <div className="jcard-k num">
                    {money(payout.eligible ? payout.withdrawable : 0, currency)}
                  </div>
                  <div className="jcard-l">
                    {payout.eligible
                      ? 'Retirable maintenant'
                      : `Retirable maintenant (potentiel : ${money(payout.withdrawable, currency)})`}
                  </div>
                </div>
                <div>
                  <div className="jcard-k num">{payout.profitDays.count} / {payout.profitDays.required}</div>
                  <div className="jcard-l">Jours de profit</div>
                </div>
              </div>

              {!payout.eligible ? (
                <div className="jmissing">
                  <span className="jmissing-t">Ce qu’il manque :</span>
                  <ul>
                    {payout.missing.profitDays > 0 ? <li>{payout.missing.profitDays} jour(s) de profit</li> : null}
                    {payout.missing.cycleProfit > 0 ? <li>{money(payout.missing.cycleProfit, currency)} de profit sur le cycle</li> : null}
                    {payout.missing.buffer > 0 ? <li>{money(payout.missing.buffer, currency)} pour repasser le buffer</li> : null}
                    {payout.blockers
                      .filter((b) => b !== 'profit_days_not_met' && b !== 'below_buffer' && b !== 'cycle_profit_not_met')
                      .map((b) => (
                        <li key={b}>{BLOCKER_LABELS[b] ?? b}</li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>

          {/* Saisie — toujours à l'écran (repliée par défaut) */}
          <EntryForms accountId={account.id} currency={currency} today={today} title="Ajouter une entrée" />
        </aside>

        {/* Espace de travail : onglets (Calendrier | Historique), extensible tranche 2/3 */}
        <section className="acct2-work">
          <div className="acct2-work-head">
            <AccountViewTabs accountId={account.id} view={view} />
          </div>

          {view === 'historique' ? (
            <div className="acct2-hist">
              <div className="acct2-hist-tools">
                <Link href={`/app/accounts/${account.id}/import`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Importer CSV
                </Link>
                <a href={`/app/accounts/${account.id}/export`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  Exporter CSV
                </a>
              </div>

              {/* Totaux — remplit l'en-tête et donne le résumé du compte */}
              <div className="card">
                <CardTitle icon={Hash}>Totaux</CardTitle>
                <div className="acct2-monthstats">
                  <Stat icon={Hash} label="Entrées" value={String(trades.length)} />
                  <Stat icon={TrendingUp} label="P&L net cumulé" value={signed(ev.netProfit, currency)} color={pnlColor(ev.netProfit)} />
                  <Stat icon={Percent} label="Taux de réussite" value={winRate === null ? '—' : `${winRate}%`} sub={decidedCount ? `${winCount} G · ${lossCount} P` : undefined} />
                </div>
              </div>

              {/* Historique filtrable + sélection multiple + suppression par lot */}
              <HistoryPanel trades={historyRows} accountId={account.id} currency={currency} />
            </div>
          ) : view === 'analytics' && analytics ? (
            <AnalyticsPanel
              analytics={analytics}
              currency={currency}
              accountId={account.id}
              startingBalance={start}
            />
          ) : (
            <div className="acct2-cal">
              <MonthCalendar
                view={monthView}
                accountId={account.id}
                activeDay={dayParam}
                addedDay={highlightParam}
                consistency={consistencyInfo}
              />

              {/* Bandeau sous le calendrier : détail du jour cliqué, sinon récap + dernières entrées */}
              <div className="acct2-below">
                {dayParam ? (
                  <div className="card">
                    <div className="acct2-below-head">
                      <h3 className="acct-rules-title" style={{ marginBottom: 0 }}>Détail du {dayParam}</h3>
                      <Link
                        href={`/app/accounts/${account.id}?view=calendrier&month=${monthKey(monthView.year, monthView.month)}`}
                        className="link-accent"
                      >
                        Fermer
                      </Link>
                    </div>
                    {dayTrades.length === 0 ? (
                      <p className="jsub mt-3">Aucune entrée ce jour-là.</p>
                    ) : (
                      <div className="table-wrap mt-4">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th className="num">P&L</th>
                              <th>Tags</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayTrades.map((t) => {
                              const pnlNet = Number(t.pnl) - (t.fees === null ? 0 : Number(t.fees));
                              const editHref = `/app/accounts/${account.id}/trades/${t.id}`;
                              return (
                                <tr key={t.id}>
                                  <td data-label="Type">
                                    <Link href={editHref} className="jrow-link">
                                      {t.symbol ? `${t.symbol}${t.direction ? ` · ${t.direction}` : ''}` : 'Journalier'}
                                    </Link>
                                  </td>
                                  <td data-label="P&L" className="num" style={{ color: pnlColor(pnlNet) }}>
                                    <Link href={editHref} className="jrow-link" style={{ color: 'inherit' }}>
                                      {signed(pnlNet, currency)}
                                    </Link>
                                  </td>
                                  <td data-label="Tags">
                                    <div className="jchips">
                                      {t.tags.map((tag) => (
                                        <span key={tag} className="jchip">{tagLabel(tag)}</span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="admin-row-actions">
                                    <div className="flex items-center justify-end gap-1">
                                      <Link href={editHref} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>Éditer</Link>
                                      <form action={deleteTrade}>
                                        <input type="hidden" name="id" value={t.id} />
                                        <input type="hidden" name="account_id" value={account.id} />
                                        <Button type="submit" variant="ghost" size="sm" iconOnly icon={Trash2} className="btn-danger-ghost" aria-label="Supprimer l’entrée" />
                                      </form>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Récap du mois — relié au mois affiché par le calendrier */}
                    <div className="card">
                      <CardTitle icon={CalendarDays}>Récap de {monthView.label}</CardTitle>
                      <div className="acct2-monthstats">
                        <Stat icon={TrendingUp} label="Total du mois" value={signed(monthTotal, currency)} color={pnlColor(monthTotal)} />
                        <Stat icon={CalendarDays} label="Jours actifs" value={String(monthActiveDays)} />
                        <Stat icon={CalendarCheck} label="Jours validés" value={String(monthTradingDays)} />
                        <Stat icon={TrendingUp} label="Meilleur jour" value={bestDay ? signed(bestDay.pnl, currency) : '—'} sub={bestDay?.date} />
                        <Stat icon={TrendingDown} label="Pire jour" value={worstDay ? signed(worstDay.pnl, currency) : '—'} sub={worstDay?.date} />
                        <Stat icon={Flame} label="Série en cours" value={streak === 0 ? '—' : String(streak)} sub={streak > 0 ? streakLabel : undefined} />
                      </div>
                    </div>

                    {/* Dernières entrées — vérifier une saisie sans changer d'onglet */}
                    <div className="card">
                      <div className="acct2-recent-head">
                        <h3 className="acct-rules-title" style={{ marginBottom: 0 }}>Dernières entrées</h3>
                        {trades.length > recentTrades.length ? (
                          <Link href={`/app/accounts/${account.id}?view=historique`} className="link-accent">
                            Voir tout ({trades.length})
                          </Link>
                        ) : null}
                      </div>
                      {recentTrades.length === 0 ? (
                        <p className="jsub mt-3">Aucune entrée. Commence par un P&L rapide dans la console.</p>
                      ) : (
                        <div className="table-wrap mt-3">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th className="num">P&L</th>
                                <th>Tags</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentTrades.map((t) => {
                                const pnlNet = Number(t.pnl) - (t.fees === null ? 0 : Number(t.fees));
                                const editHref = `/app/accounts/${account.id}/trades/${t.id}`;
                                return (
                                  <tr key={t.id}>
                                    <td data-label="Date" className="num">
                                      <Link href={editHref} className="jrow-link">{t.trade_date}</Link>
                                    </td>
                                    <td data-label="Type">
                                      <Link href={editHref} className="jrow-link">
                                        {t.symbol ? `${t.symbol}${t.direction ? ` · ${t.direction}` : ''}` : 'Journalier'}
                                      </Link>
                                    </td>
                                    <td data-label="P&L" className="num" style={{ color: pnlColor(pnlNet) }}>
                                      <Link href={editHref} className="jrow-link" style={{ color: 'inherit' }}>
                                        {signed(pnlNet, currency)}
                                      </Link>
                                    </td>
                                    <td data-label="Tags">
                                      <div className="jchips">
                                        {t.tags.map((tag) => (
                                          <span key={tag} className="jchip">{tagLabel(tag)}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
