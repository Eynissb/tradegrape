import { Target, Coins, Sigma, Ratio, Scale, TrendingUp, TrendingDown, Flame, type LucideIcon } from 'lucide-react';
import type { Bucket, DistributionBin } from '@/lib/journal/analytics';
import { money, pnlColor, signed } from '@/app/app/_components/journal-ui';

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** Carte de métrique : icône + libellé gris en haut, valeur très grosse en dessous. */
export function Stat({ label, value, color, sub, icon: Icon }: { label: string; value: string; color?: string; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="acct2-stat">
      <div className="acct2-stat-head">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>
      <div className="acct2-stat-k" style={color ? { color } : undefined}>{value}</div>
      {sub ? <div className="acct2-stat-sub">{sub}</div> : null}
    </div>
  );
}

/** Tableau de ventilation catégorie → entrées / P&L net / réussite. */
export function Breakdown({
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

/** Histogramme de distribution du P&L (barres horizontales). */
export function DistributionBars({ bins }: { bins: DistributionBin[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="acct2-dist">
      {bins.map((b, i) => (
        <div key={i} className="acct2-dist-row">
          <span className="acct2-dist-label num">{compact.format(b.from)} … {compact.format(b.to)}</span>
          <span className="acct2-dist-track">
            <span className="acct2-dist-bar" style={{ width: `${(b.count / max) * 100}%`, background: b.from >= 0 ? 'var(--ok)' : 'var(--danger)' }} />
          </span>
          <span className="acct2-dist-count num">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

/** Grille de métriques communes (win rate, expectancy, R, profit factor…). */
export function MetricsGrid({ metrics, currency }: { metrics: import('@/lib/journal/analytics').Metrics; currency: string }) {
  const m = metrics;
  const profitFactor =
    m.profitFactor !== null ? m.profitFactor.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : m.grossWin > 0 ? '∞' : '—';
  return (
    <div className="acct2-monthstats">
      <Stat icon={Target} label="Taux de réussite" value={m.winRate === null ? '—' : `${m.winRate}%`} sub={`${m.wins} G · ${m.losses} P`} />
      <Stat icon={Coins} label="P&L net" value={signed(m.netPnl, currency)} color={pnlColor(m.netPnl)} />
      <Stat icon={Sigma} label="Expectancy / entrée" value={signed(m.expectancy, currency)} color={pnlColor(m.expectancy)} />
      <Stat icon={Ratio} label="R moyen" value={m.avgR === null ? '—' : `${m.avgR}R`} sub="1R = perte moyenne" />
      <Stat icon={Scale} label="Profit factor" value={profitFactor} />
      <Stat icon={TrendingUp} label="Gain moyen" value={money(m.avgWin, currency)} color="var(--ok)" />
      <Stat icon={TrendingDown} label="Perte moyenne" value={m.avgLoss ? `−${money(m.avgLoss, currency)}` : money(0, currency)} color="var(--danger)" />
      <Stat icon={Flame} label="Série gains / pertes" value={`${m.maxWinStreak} / ${m.maxLossStreak}`} sub="plus longues séries" />
    </div>
  );
}
