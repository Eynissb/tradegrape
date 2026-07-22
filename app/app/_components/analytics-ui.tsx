import { Target, Coins, Sigma, Ratio, Scale, TrendingUp, TrendingDown, Flame, ArrowDownRight, type LucideIcon } from 'lucide-react';
import type { Bucket, DistributionBin } from '@/lib/journal/analytics';
import { compactNumber, money, pnlColor, signed } from '@/app/app/_components/journal-ui';


/** Carte de métrique : icône + libellé gris en haut, valeur très grosse en dessous. */
export function Stat({ label, value, color, sub, icon: Icon }: { label: string; value: string; color?: string; sub?: string; icon?: LucideIcon }) {
  return (
    <div className="acct2-stat">
      <div className="acct2-stat-head">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>
      <div className="acct2-stat-k" style={color ? { color } : undefined}>{value}</div>
      {/* Sous-ligne TOUJOURS réservée, même vide : sans quoi les cartes sans
          sous-ligne (« Jours actifs ») sont plus courtes que celles qui en ont
          une (« Meilleur jour ») et les valeurs ne s'alignent plus entre elles. */}
      <div className="acct2-stat-sub" title={sub ?? undefined}>{sub ?? ' '}</div>
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
        <div className="kv-list" role="table" aria-label={title}>
          {/* En-têtes : sans eux « ES · 12 · 58% » ne dit pas ce que valent 12 et 58%. */}
          <div className="kv-head" role="row">
            <span role="columnheader">{catHeader}</span>
            <span role="columnheader">P&L net</span>
          </div>
          {buckets.map((b) => (
            <div key={b.key} className="kv-row" role="row">
              <span className="kv-key" role="cell">
                {b.label}
                <span className="kv-meta"> · {b.entries} entrée{b.entries > 1 ? 's' : ''} · {b.winRate === null ? '—' : `${b.winRate}% réussite`}</span>
              </span>
              <span className="kv-val" role="cell" style={{ color: pnlColor(b.netPnl) }}>{signed(b.netPnl, currency)}</span>
            </div>
          ))}
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
          <span className="acct2-dist-label num">{compactNumber(b.from)} … {compactNumber(b.to)}</span>
          <span className="acct2-dist-track">
            <span className={`acct2-dist-bar ${b.from >= 0 ? 'is-win' : 'is-loss'}`} style={{ width: `${(b.count / max) * 100}%` }} />
          </span>
          <span className="acct2-dist-count num">{b.count}</span>
        </div>
      ))}
    </div>
  );
}

/** Grille de métriques communes (win rate, expectancy, R, profit factor…). */
export function MetricsGrid({
  metrics,
  currency,
  maxDrawdown,
}: {
  metrics: import('@/lib/journal/analytics').Metrics;
  currency: string;
  /** Repli max subi sur la période. Optionnel : toutes les vues n'ont pas de courbe. */
  maxDrawdown?: import('@/lib/journal/analytics').MaxDrawdown;
}) {
  const m = metrics;
  const profitFactor =
    m.profitFactor !== null ? m.profitFactor.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : m.grossWin > 0 ? '∞' : '—';

  /* Drawdown SUBI (pic→creux réel), à ne pas confondre avec le plancher de
     drawdown de la firm, qui est une limite contractuelle. */
  const dd = maxDrawdown;
  const ddValue = !dd || dd.amount === 0 ? money(0, currency) : `−${money(dd.amount, currency)}`;
  const ddSub = !dd || dd.amount === 0
    ? 'aucun repli sur la période'
    : [dd.pct !== null ? `${dd.pct.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%` : null,
       `${dd.peakDate} → ${dd.troughDate}`].filter(Boolean).join(' · ');

  return (
    <div className="acct2-monthstats">
      <Stat icon={Target} label="Taux de réussite" value={m.winRate === null ? '—' : `${m.winRate}%`} sub={`${m.wins} G · ${m.losses} P`} />
      <Stat icon={Coins} label="P&L net" value={signed(m.netPnl, currency)} color={pnlColor(m.netPnl)} />
      <Stat icon={Sigma} label="Expectancy / entrée" value={signed(m.expectancy, currency)} />
      <Stat icon={Ratio} label="R moyen" value={m.avgR === null ? '—' : `${m.avgR}R`} sub="1R = perte moyenne" />
      <Stat icon={Scale} label="Profit factor" value={profitFactor} />
      <Stat icon={TrendingUp} label="Gain moyen" value={money(m.avgWin, currency)} />
      <Stat icon={TrendingDown} label="Perte moyenne" value={m.avgLoss ? `−${money(m.avgLoss, currency)}` : money(0, currency)} />
      <Stat icon={Flame} label="Série gains / pertes" value={`${m.maxWinStreak} / ${m.maxLossStreak}`} sub="plus longues séries" />
      {maxDrawdown ? (
        <Stat icon={ArrowDownRight} label="Drawdown max subi" value={ddValue} sub={ddSub} />
      ) : null}
    </div>
  );
}
