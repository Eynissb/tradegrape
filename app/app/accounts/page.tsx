import Link from 'next/link';
import { Wallet, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { evaluateAccount, evaluatePayout } from '@/lib/rules/futures-engine';
import { rulesForStatus } from '@/lib/rules/phase';
import { toEngineTrade, STATUS_LABELS, type DbTradeRow, type RulesSnapshot } from '@/lib/journal/snapshot';
import type { RuleState } from '@/lib/rules/types';
import { buildCumulative, type AnalyticsTrade } from '@/lib/journal/analytics';
import { buttonClasses } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { money, signed, pnlColor, stateColor } from '../_components/journal-ui';
import AccountsToolbar from './AccountsToolbar';

export const metadata = { title: 'Comptes — Tradegrape' };

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

function phaseLabel(status: string): { label: string; cls: string } {
  if (status === 'funded') return { label: 'Financé', cls: 'acct-phase--funded' };
  if (status === 'evaluation') return { label: 'Évaluation', cls: 'acct-phase--eval' };
  return { label: status, cls: 'acct-phase--other' };
}

/** Libellé du type de drawdown. Le TRAIL (trailing intraday) est le piège n°1 : on le signale. */
const DD_LABEL: Record<string, string> = {
  STATIC: 'Drawdown fixe',
  EOD: 'Drawdown fin de journée',
  TRAIL: 'Drawdown trailing intraday',
};

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DATE_FR.format(new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)));
}

/** Courbe lissée (Catmull-Rom → bézier cubique) dans un viewBox 0..100 × 0..40. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return '';
  const clampY = (n: number) => Math.max(1.5, Math.min(38.5, n));
  const d = [`M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
    d.push(`C${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`);
  }
  return d.join(' ');
}

/** Courbe d'équité miniature (P&L net cumulé). SSR pur, pas de plancher. */
function Sparkline({ id, values, positive }: { id: string; values: number[]; positive: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const n = values.length;
  const y = (v: number) => 37 - ((v - min) / range) * 34;
  const pts = values.map((v, i) => [(i / (n - 1)) * 100, y(v)] as const);
  const line = smoothPath(pts);
  const area = `${line} L100 40 L0 40 Z`;
  const zero = y(0);
  const capY = (pts[n - 1][1] / 40) * 100;
  const color = positive ? 'var(--lime)' : 'var(--red)';
  return (
    <div className="acct-spark-wrap">
      <svg className="acct-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" style={{ ['--spk' as string]: color }}>
        <defs>
          <linearGradient id={`spk-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="0.55" stopColor={color} stopOpacity="0.08" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2="100" y1={zero} y2={zero} stroke="var(--card-brd)" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={area} fill={`url(#spk-${id})`} />
        <path className="acct-spark-line" d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="acct-spark-cap" style={{ top: `${capY}%`, background: color, color }} aria-hidden="true" />
    </div>
  );
}

/** Statut « santé » raffiné : pastille lumineuse + libellé teinté (pas de gros pill). */
function CardStatus({ state }: { state: RuleState }) {
  const color = stateColor(state);
  return (
    <span className="acct-status" style={{ ['--sc' as string]: color }}>
      <span className="acct-status-dot" />
      {STATUS_LABELS[state]}
    </span>
  );
}

/** Modèle de vue d'un compte — calculé une fois, rendu en carte OU en ligne compacte. */
function buildModel(a: AccountRow, rows: DbTradeRow[]) {
  const snap = a.rules_snapshot;
  const currency = snap.display?.currency ?? 'USD';
  const trades = rows.map(toEngineTrade);
  const resolved = rulesForStatus(snap.rules, a.status);
  const ev = evaluateAccount(resolved, Number(a.starting_balance), trades);
  const aTrades: AnalyticsTrade[] = rows.map((r) => ({ ...toEngineTrade(r), symbol: '', tags: [] }));
  const spark = buildCumulative(aTrades).map((p) => p.pnl);
  const lastDate = rows.length ? rows.map((r) => r.trade_date).sort().at(-1)! : null;
  const rulesChanged = !!a.rules_changed_at && (!a.rules_ack_at || a.rules_ack_at < a.rules_changed_at);

  const payout =
    a.status === 'funded' && snap.payout
      ? evaluatePayout(snap.payout, Number(a.starting_balance), ev.balance, trades)
      : null;
  let payoutText: string | null = null;
  let payoutReady = false;
  if (payout) {
    if (payout.eligible) {
      payoutReady = true;
      payoutText = `Prêt à retirer ${money(payout.withdrawable, currency)}`;
    } else {
      const parts: string[] = [];
      if (payout.missing.profitDays > 0) parts.push(`${payout.missing.profitDays} jour${payout.missing.profitDays > 1 ? 's' : ''} de profit`);
      if (payout.missing.cycleProfit > 0) parts.push(money(payout.missing.cycleProfit, currency));
      if (payout.missing.buffer > 0) parts.push(`${money(payout.missing.buffer, currency)} de buffer`);
      payoutText = parts.length ? `Il te manque ${parts.join(' + ')}` : 'Presque prêt à retirer';
    }
  }

  return {
    a,
    snap,
    currency,
    ev,
    phase: phaseLabel(a.status),
    spark,
    lastDate,
    count: rows.length,
    rulesChanged,
    ddTrap: resolved.drawdownType === 'TRAIL',
    ddLabel: DD_LABEL[resolved.drawdownType] ?? 'Drawdown',
    objectivePct: ev.profitTarget ? Math.round(ev.profitTarget.ratio * 100) : null,
    payoutText,
    payoutReady,
  };
}
type Model = ReturnType<typeof buildModel>;

/** Vue « Cartes » — riche, une carte par compte. */
function AccountCard({ m }: { m: Model }) {
  const { a, snap, currency, ev, phase } = m;
  return (
    <Link href={`/app/accounts/${a.id}`} className="acct-card card card-interactive">
      {m.rulesChanged ? (
        <div className="acct-alert">
          <TriangleAlert size={14} aria-hidden="true" />
          Règles modifiées — à vérifier
        </div>
      ) : null}

      <div className="acct-card-top">
        <div className="acct-card-id">
          <span className={`acct-phase ${phase.cls}`}>{phase.label}</span>
          <div className="acct-card-title">{a.label ?? 'Compte'}</div>
          <div className="acct-card-meta">{snap.display?.firmName} · {snap.display?.planName}</div>
          <div className={`acct-ddtag${m.ddTrap ? ' is-trap' : ''}`}>
            {m.ddLabel} · plancher <b className="num">{money(ev.drawdownFloor, currency)}</b>
          </div>
        </div>
        <CardStatus state={ev.status} />
      </div>

      {m.spark.length >= 2 ? <Sparkline id={a.id} values={m.spark} positive={ev.netProfit >= 0} /> : null}

      <div className="acct-card-figs">
        <div>
          <div className="acct-fig-k num">{money(ev.balance, currency)}</div>
          <div className="acct-fig-l">Solde</div>
        </div>
        <div>
          <div className="acct-fig-k num" style={{ color: pnlColor(ev.netProfit) }}>{signed(ev.netProfit, currency)}</div>
          <div className="acct-fig-l">P&L net</div>
        </div>
      </div>

      {ev.profitTarget ? (
        <div className="acct-gauge">
          <div className="acct-gauge-head">
            <span>Objectif</span>
            <span className="num" style={{ color: stateColor(ev.profitTarget.state) }}>{m.objectivePct}%</span>
          </div>
          <span
            className="acct-obar"
            style={{ ['--v' as string]: `${m.objectivePct}%`, ['--fill' as string]: stateColor(ev.profitTarget.state) }}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div className="acct-rules">
        <span className="acct-rule">
          <span className="acct-rule-dot" style={{ background: stateColor(ev.drawdown.state) }} />
          Drawdown · marge <b className="num">{money(ev.drawdown.value, currency)}</b>
        </span>
        {ev.dailyLoss ? (
          <span className="acct-rule">
            <span className="acct-rule-dot" style={{ background: stateColor(ev.dailyLoss.state) }} />
            Daily loss · reste <b className="num">{money(ev.dailyLoss.value, currency)}</b>
          </span>
        ) : null}
        {ev.consistency ? (
          <span className="acct-rule">
            <span className="acct-rule-dot" style={{ background: stateColor(ev.consistency.state) }} />
            Cohérence · plus gros jour <b className="num">{Math.round(ev.consistency.value)}%</b>
          </span>
        ) : null}
        <span className="acct-rule">
          <span className="acct-rule-dot" style={{ background: ev.tradingDays.met ? 'var(--lime)' : 'var(--ink3)' }} />
          Jours <b className="num">{ev.tradingDays.count}/{ev.tradingDays.required}</b>
        </span>
      </div>

      {m.payoutText ? (
        <div className={`acct-payout${m.payoutReady ? ' is-ready' : ''}`}>
          <span className="acct-payout-l">Payout</span>
          <span className="acct-payout-v">{m.payoutText}</span>
        </div>
      ) : null}

      <div className="acct-foot">
        <span>{m.count === 0 ? 'Aucune entrée' : `${m.count} entrée${m.count > 1 ? 's' : ''}`}</span>
        {m.lastDate ? <span>Dernière activité {fmtDay(m.lastDate)}</span> : null}
      </div>
    </Link>
  );
}

/** Vue « Compact » — une ligne dense par compte, l'essentiel en un coup d'œil. */
function AccountRow({ m }: { m: Model }) {
  const { a, snap, currency, ev, phase } = m;
  return (
    <Link href={`/app/accounts/${a.id}`} className="acct-row card card-interactive">
      <span className="acct-row-dot" style={{ ['--sc' as string]: stateColor(ev.status) }} aria-hidden="true" />
      <span className="acct-row-name">
        <span className="acct-row-title">
          {a.label ?? 'Compte'}
          {m.rulesChanged ? <TriangleAlert className="acct-row-alert" size={13} aria-label="Règles modifiées" /> : null}
        </span>
        <span className="acct-row-meta">{snap.display?.firmName} · {snap.display?.planName}</span>
      </span>
      <span className={`acct-phase ${phase.cls} acct-row-phase`}>{phase.label}</span>
      <span className="acct-row-cell arc-solde">
        <span className="acct-row-k num">{money(ev.balance, currency)}</span>
        <span className="acct-row-l">Solde</span>
      </span>
      <span className="acct-row-cell arc-pnl">
        <span className="acct-row-k num" style={{ color: pnlColor(ev.netProfit) }}>{signed(ev.netProfit, currency)}</span>
        <span className="acct-row-l">P&L net</span>
      </span>
      <span className="acct-row-cell arc-obj">
        {ev.profitTarget ? (
          <>
            <span className="acct-row-objbar" style={{ ['--v' as string]: `${m.objectivePct}%`, ['--fill' as string]: stateColor(ev.profitTarget.state) }} aria-hidden="true" />
            <span className="acct-row-l">Objectif <b className="num" style={{ color: stateColor(ev.profitTarget.state) }}>{m.objectivePct}%</b></span>
          </>
        ) : (
          <span className="acct-row-l">—</span>
        )}
      </span>
      <span className="acct-row-cell arc-dd">
        <span className="acct-row-k num" style={{ color: stateColor(ev.drawdown.state) }}>{money(ev.drawdown.value, currency)}</span>
        <span className="acct-row-l">Marge drawdown</span>
      </span>
      <span className="acct-row-cell arc-days">
        <span className="acct-row-k num">{ev.tradingDays.count}/{ev.tradingDays.required}</span>
        <span className="acct-row-l">Jours</span>
      </span>
    </Link>
  );
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; view?: string }>;
}) {
  const { filter, view } = await searchParams;
  const activeFilter = filter === 'evaluation' || filter === 'funded' ? filter : 'all';
  const activeView = view === 'compact' ? 'compact' : 'cards';

  const supabase = await createClient();
  const { data: accountsData } = await supabase
    .from('journal_accounts')
    .select('id, label, account_size, starting_balance, status, rules_snapshot, rules_changed_at, rules_ack_at')
    .order('created_at', { ascending: false })
    .returns<AccountRow[]>();

  const all = accountsData ?? [];
  const ids = all.map((a) => a.id);
  const tradesByAccount = new Map<string, DbTradeRow[]>();
  if (ids.length > 0) {
    const { data: trades } = await supabase
      .from('trades')
      .select('id, account_id, trade_date, closed_at, pnl, fees')
      .in('account_id', ids)
      .returns<(DbTradeRow & { account_id: string })[]>();
    for (const t of trades ?? []) {
      const list = tradesByAccount.get(t.account_id) ?? [];
      list.push(t);
      tradesByAccount.set(t.account_id, list);
    }
  }

  const filtered = activeFilter === 'all' ? all : all.filter((a) => a.status === activeFilter);
  const models = filtered.map((a) => buildModel(a, tradesByAccount.get(a.id) ?? []));

  return (
    <main className="jwrap">
      <div className="acct-head">
        <div className="acct-head-title">
          <h1 className="jh1">Comptes</h1>
          <p className="jsub">Chaque compte face à ses règles : drawdown, daily loss, objectif, payout.</p>
        </div>
        {all.length > 0 ? <AccountsToolbar view={activeView} filter={activeFilter} /> : null}
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aucun compte pour l’instant"
          description="Choisis une offre du comparateur (ou saisis ta firm) et le journal configure ses règles automatiquement."
          action={<Link href="/app/accounts/new" className={buttonClasses()}>Ajouter mon premier compte</Link>}
        />
      ) : models.length === 0 ? (
        <div className="card acct-empty-filter">Aucun compte {activeFilter === 'funded' ? 'financé' : 'en évaluation'} pour l’instant.</div>
      ) : activeView === 'compact' ? (
        <div className="acct-list">
          {models.map((m) => (
            <AccountRow key={m.a.id} m={m} />
          ))}
        </div>
      ) : (
        <div className="acct-cards">
          {models.map((m) => (
            <AccountCard key={m.a.id} m={m} />
          ))}
        </div>
      )}
    </main>
  );
}
