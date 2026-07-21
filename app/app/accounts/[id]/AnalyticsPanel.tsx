import type { Analytics, Bucket } from '@/lib/journal/analytics';
import { money, pnlColor, signed } from '@/app/app/_components/journal-ui';
import EquityChart from './EquityChart';
import AnalyticsControls from './AnalyticsControls';

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

function Stat({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="acct2-stat">
      <div className="acct2-stat-k" style={color ? { color } : undefined}>{value}</div>
      <div className="acct2-stat-l">{label}</div>
      {sub ? <div className="acct2-stat-sub">{sub}</div> : null}
    </div>
  );
}

function Breakdown({
  title,
  buckets,
  currency,
  emptyHint,
  catHeader = 'Catégorie',
}: {
  title: string;
  buckets: Bucket[];
  currency: string;
  emptyHint: string;
  catHeader?: string;
}) {
  return (
    <div className="card acct2-bd">
      <h3 className="acct-rules-title">{title}</h3>
      {buckets.length === 0 ? (
        <p className="jsub">{emptyHint}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{catHeader}</th>
                <th className="num">Entrées</th>
                <th className="num">P&L net</th>
                <th className="num">Réussite</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td data-label={catHeader}>{b.label}</td>
                  <td data-label="Entrées" className="num">{b.entries}</td>
                  <td data-label="P&L net" className="num" style={{ color: pnlColor(b.netPnl) }}>{signed(b.netPnl, currency)}</td>
                  <td data-label="Réussite" className="num">{b.winRate === null ? '—' : `${b.winRate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPanel({
  analytics,
  currency,
  accountId,
  startingBalance,
}: {
  analytics: Analytics;
  currency: string;
  accountId: string;
  startingBalance: number;
}) {
  const m = analytics.metrics;
  const profitFactor =
    m.profitFactor !== null ? m.profitFactor.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : m.grossWin > 0 ? '∞' : '—';
  const distMax = Math.max(1, ...analytics.distribution.map((b) => b.count));

  return (
    <div className="acct2-analytics">
      <AnalyticsControls accountId={accountId} preset={analytics.range.preset} from={analytics.range.from} to={analytics.range.to} />

      {analytics.rangeEntries === 0 ? (
        <div className="card acct2-empty">Aucune entrée sur cette période. Change de période ou saisis un P&L.</div>
      ) : (
        <>
          {/* Métriques clés */}
          <div className="card">
            <h3 className="acct-rules-title">Métriques · {analytics.rangeEntries} entrée(s)</h3>
            <div className="acct2-monthstats">
              <Stat label="Taux de réussite" value={m.winRate === null ? '—' : `${m.winRate}%`} sub={`${m.wins} G · ${m.losses} P`} />
              <Stat label="P&L net" value={signed(m.netPnl, currency)} color={pnlColor(m.netPnl)} />
              <Stat label="Expectancy / entrée" value={signed(m.expectancy, currency)} color={pnlColor(m.expectancy)} />
              <Stat label="R moyen" value={m.avgR === null ? '—' : `${m.avgR}R`} sub="1R = perte moyenne" />
              <Stat label="Profit factor" value={profitFactor} />
              <Stat label="Gain moyen" value={money(m.avgWin, currency)} color="var(--ok)" />
              <Stat label="Perte moyenne" value={m.avgLoss ? `−${money(m.avgLoss, currency)}` : money(0, currency)} color="var(--danger)" />
              <Stat label="Série gains / pertes" value={`${m.maxWinStreak} / ${m.maxLossStreak}`} sub="plus longues séries" />
            </div>
          </div>

          {/* Courbe d'équité + plancher */}
          <div className="card">
            <h3 className="acct-rules-title">Équité & plancher de drawdown</h3>
            <EquityChart points={analytics.equity} startingBalance={startingBalance} currency={currency} />
          </div>

          {/* Distribution des gains / pertes */}
          <div className="card">
            <h3 className="acct-rules-title">Distribution du P&L</h3>
            <div className="acct2-dist">
              {analytics.distribution.map((b, i) => (
                <div key={i} className="acct2-dist-row">
                  <span className="acct2-dist-label num">{compact.format(b.from)} … {compact.format(b.to)}</span>
                  <span className="acct2-dist-track">
                    <span
                      className="acct2-dist-bar"
                      style={{ width: `${(b.count / distMax) * 100}%`, background: b.from >= 0 ? 'var(--ok)' : 'var(--danger)' }}
                    />
                  </span>
                  <span className="acct2-dist-count num">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ventilations */}
          <div className="acct2-breakdowns">
            <Breakdown title="Par symbole" buckets={analytics.bySymbol} currency={currency} catHeader="Symbole" emptyHint="Aucun trade détaillé sur la période (les entrées journalières sont exclues)." />
            <Breakdown title="Par jour de la semaine" buckets={analytics.byWeekday} currency={currency} catHeader="Jour" emptyHint="Aucune entrée sur la période." />
            <Breakdown title="Par heure" buckets={analytics.byHour} currency={currency} catHeader="Heure" emptyHint="Aucun trade détaillé horodaté sur la période." />
            <Breakdown title="Par setup" buckets={analytics.bySetup} currency={currency} catHeader="Setup" emptyHint="Aucun tag de setup sur la période." />
            <Breakdown title="Par émotion" buckets={analytics.byEmotion} currency={currency} catHeader="Émotion" emptyHint="Aucun tag d'émotion sur la période." />
          </div>
        </>
      )}
    </div>
  );
}
