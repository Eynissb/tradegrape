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
  CircleCheck,
  CircleX,
  Shield,
  Target,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { buildMonthView, parseMonth } from '@/lib/journal/calendar';
import { tagLabel } from '@/lib/journal/tags';
import type { RuleState } from '@/lib/rules/types';
import {
  money,
  pnlColor,
  signed,
  StatusBadge,
} from '@/app/app/_components/journal-ui';
import Badge from '@/components/ui/Badge';
import Button, { buttonClasses } from '@/components/ui/Button';
import Progress, { type Tone } from '@/components/ui/Progress';
import { deleteAccount, deleteTrade } from '@/app/app/actions';
import EntryForms from './EntryForms';
import MonthCalendar from './MonthCalendar';

export const metadata = { title: 'Compte — Tradegrape' };

/** État moteur → ton de jauge DS. */
function toneOf(state: RuleState): Tone {
  if (state === 'warning') return 'warn';
  if (state === 'danger' || state === 'failed') return 'danger';
  return 'ok';
}

/** Statut doublé (icône + libellé) pour warn/danger — jamais la couleur seule. */
function statusFor(state: RuleState, warnLabel: string, dangerLabel: string) {
  if (state === 'warning') return { icon: TriangleAlert, label: warnLabel };
  if (state === 'danger' || state === 'failed') return { icon: CircleX, label: dangerLabel };
  return undefined;
}

interface AccountRow {
  id: string;
  label: string | null;
  account_size: number;
  starting_balance: number;
  status: string;
  rules_snapshot: RulesSnapshot;
}

interface TradeListRow extends DbTradeRow {
  symbol: string;
  direction: string | null;
  tags: string[];
  notes: string | null;
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; month?: string; day?: string }>;
}) {
  const { id } = await params;
  const { error, month: monthParam, day: dayParam } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const { data: account } = await supabase
    .from('journal_accounts')
    .select('id, label, account_size, starting_balance, status, rules_snapshot')
    .eq('id', id)
    .single<AccountRow>();

  if (!account) notFound();

  const { data: tradeRows } = await supabase
    .from('trades')
    .select('id, trade_date, closed_at, pnl, fees, symbol, direction, tags, notes')
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

  // Historique filtré sur un jour si demandé.
  const visibleTrades = dayParam ? trades.filter((t) => t.trade_date === dayParam) : trades;

  return (
    <main className="jwrap jwrap-wide">
      <nav className="jcrumb">
        <Link href="/app" className="link-accent">
          Mes comptes
        </Link>{' '}
        / {account.label ?? 'Compte'}
      </nav>

      <div className="jhead">
        <div>
          <h1 className="jh1">{account.label ?? 'Compte'}</h1>
          <p className="jsub">
            {snap.display?.firmName} · {snap.display?.planName} ·{' '}
            {money(Number(account.account_size), currency)}
          </p>
        </div>
        <div className="jhead-right">
          <StatusBadge state={ev.status} />
          <div className="jbalance num">{money(ev.balance, currency)}</div>
          <div className="jbalance-sub num" style={{ color: pnlColor(ev.netProfit) }}>
            {signed(ev.netProfit, currency)}
          </div>
        </div>
      </div>

      {error ? <div className="notice notice-error mt-4">{error}</div> : null}

      {ev.reasons.length > 0 ? (
        <div className="notice notice-error mt-4">
          {ev.reasons.map((r) => REASON_LABELS[r] ?? r).join(' · ')}
        </div>
      ) : null}

      <div className="acct-grid mt-6">
        {/* Colonne latérale : l'information la plus critique, avant le calendrier */}
        <aside className="acct-side">
          {/* Jauges de règles — surface solide, lisibilité maximale */}
          <div className="card acct-rules">
            <h2 className="acct-rules-title">Règles en temps réel</h2>
            <div className="acct-gauges">
              {ev.dailyLoss ? (
                <Progress
                  label="Perte journalière restante"
                  labelIcon={Shield}
                  value={ev.dailyLoss.value}
                  max={ev.dailyLoss.limit}
                  display={`${money(ev.dailyLoss.value, currency)} / ${money(ev.dailyLoss.limit, currency)}`}
                  tone={toneOf(ev.dailyLoss.state)}
                  status={statusFor(ev.dailyLoss.state, 'Proche de la limite', 'Limite atteinte')}
                />
              ) : null}

              <Progress
                label="Marge avant plancher"
                labelIcon={Shield}
                value={ev.drawdown.value}
                max={ev.drawdown.limit}
                display={money(ev.drawdown.value, currency)}
                tone={toneOf(ev.drawdown.state)}
                status={{
                  icon: ev.drawdown.state === 'ok' ? CircleCheck : TriangleAlert,
                  label: `Plancher ${money(ev.drawdownFloor, currency)} · plus haut ${money(ev.highWaterMark, currency)}`,
                }}
              />

              {ev.profitTarget ? (
                <Progress
                  label="Objectif de profit"
                  labelIcon={Target}
                  value={ev.profitTarget.value}
                  max={ev.profitTarget.limit}
                  display={`${money(ev.profitTarget.value, currency)} / ${money(ev.profitTarget.limit, currency)}`}
                  tone={ev.profitTarget.state === 'passed' ? 'ok' : 'brand'}
                  status={ev.profitTarget.state === 'passed' ? { icon: CircleCheck, label: 'Objectif atteint' } : undefined}
                />
              ) : null}

              {ev.consistency ? (
                <Progress
                  label="Cohérence (meilleur jour)"
                  labelIcon={TrendingUp}
                  value={ev.consistency.value}
                  max={ev.consistency.limit}
                  display={`${ev.consistency.value}% / ${ev.consistency.limit}% max`}
                  tone={ev.consistency.state === 'ok' ? 'ok' : 'warn'}
                  status={ev.consistency.state === 'ok' ? undefined : { icon: TriangleAlert, label: 'Un jour pèse trop dans le profit' }}
                />
              ) : null}

              <div className="acct-days">
                <span className="progress-label">Jours de trading validés</span>
                <span className="num" style={{ color: ev.tradingDays.met ? 'var(--ok)' : 'var(--text-1)' }}>
                  {ev.tradingDays.count} / {ev.tradingDays.required}
                </span>
              </div>
            </div>
          </div>

          {/* Bloc payout — surface solide */}
          <div className="jpayout card">
            <div className="jpayout-head">
              <h2 className="jh2" style={{ fontSize: '1.05rem' }}>Retrait — compte financé</h2>
              <Badge variant={payout.eligible ? 'ok' : 'warn'} icon={payout.eligible ? CircleCheck : TriangleAlert}>
                {payout.eligible ? 'Éligible' : 'Pas encore'}
              </Badge>
            </div>

            <div className="jpayout-figs">
              <div>
                <div
                  className="jcard-k num"
                  style={{ color: payout.eligible ? 'var(--ok)' : 'var(--text-3)' }}
                >
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
        </aside>

        {/* Colonne principale : calendrier, saisie, historique */}
        <div className="acct-main">
          <MonthCalendar
            view={monthView}
            accountId={account.id}
            activeDay={dayParam}
            consistency={consistencyInfo}
          />

          <h2 className="jh2 mt-8">Ajouter une entrée</h2>
          <div className="mt-4">
            <EntryForms accountId={account.id} currency={currency} today={today} />
          </div>

          <h2 className="jh2 mt-8" id="historique">
        Historique
      </h2>
      {dayParam ? (
        <div className="notice notice-info mt-4">
          Filtré sur le <strong>{dayParam}</strong> ({visibleTrades.length} entrée(s)).{' '}
          <Link href={`/app/accounts/${account.id}#historique`} className="link-accent">
            Voir tout
          </Link>
        </div>
      ) : null}
          {visibleTrades.length === 0 ? (
            <div className="card mt-4" style={{ textAlign: 'center', color: 'var(--text-3)' }}>
              {dayParam ? 'Aucune entrée ce jour-là.' : 'Aucune entrée. Commence par un P&L journalier.'}
            </div>
          ) : (
            <div className="table-wrap mt-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="num">P&L</th>
                    <th>Tags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTrades.map((t) => {
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
                        <td className="admin-row-actions">
                          <Link href={editHref} className="link-accent">Éditer</Link>
                          <form action={deleteTrade} className="mt-1">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="account_id" value={account.id} />
                            <button type="submit" className="jlink-danger">Supprimer</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <form action={deleteAccount} className="admin-danger mt-10">
        <input type="hidden" name="id" value={account.id} />
        <span>Supprimer ce compte et tout son historique.</span>
        <Button type="submit" variant="danger" size="sm">Supprimer le compte</Button>
      </form>
    </main>
  );
}
