import type { Analytics } from '@/lib/journal/analytics';
import { Breakdown, DistributionBars, MetricsGrid } from '@/app/app/_components/analytics-ui';
import EquityChart from './EquityChart';
import AnalyticsControls from './AnalyticsControls';

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
  return (
    <div className="acct2-analytics">
      <AnalyticsControls
        basePath={`/app/accounts/${accountId}`}
        baseParams={{ view: 'analytics' }}
        preset={analytics.range.preset}
        from={analytics.range.from}
        to={analytics.range.to}
      />

      {analytics.rangeEntries === 0 ? (
        <div className="card acct2-empty">Aucune entrée sur cette période. Change de période ou saisis un P&L.</div>
      ) : (
        <>
          <div className="card">
            <h3 className="acct-rules-title">Métriques · {analytics.rangeEntries} entrée(s)</h3>
            <MetricsGrid metrics={analytics.metrics} currency={currency} maxDrawdown={analytics.maxDrawdown} />
          </div>

          <div className="card">
            <h3 className="acct-rules-title">Équité & plancher de drawdown</h3>
            <EquityChart points={analytics.equity} startingBalance={startingBalance} currency={currency} />
          </div>

          <div className="card">
            <h3 className="acct-rules-title">Distribution du P&L</h3>
            <DistributionBars bins={analytics.distribution} />
          </div>

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
