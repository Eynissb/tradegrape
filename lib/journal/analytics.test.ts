import { describe, expect, it } from 'vitest';
import {
  buildAggregateAnalytics,
  buildAnalytics,
  buildCumulative,
  buildDistribution,
  buildEquityCurve,
  computeMetrics,
  resolveRange,
  type AggregateTrade,
  type AnalyticsTrade,
} from './analytics';
import type { OfferRules } from '../rules/types';

const STATIC_25K: OfferRules = {
  marketType: 'futures',
  accountSize: 25_000,
  drawdownType: 'STATIC',
  drawdownAmount: 500,
  profitTarget: 1_500,
  dailyLossLimit: null,
  consistencyPct: 100,
  minTradingDays: 1,
};

const TRAIL_50K: OfferRules = {
  marketType: 'futures',
  accountSize: 50_000,
  drawdownType: 'TRAIL',
  drawdownAmount: 2_500,
  profitTarget: 3_000,
  dailyLossLimit: null,
  consistencyPct: 100,
  minTradingDays: 1,
};

/** Helper : construit un trade détaillé. */
function t(
  date: string,
  pnl: number,
  opts: Partial<AnalyticsTrade> = {},
): AnalyticsTrade {
  return {
    id: `${date}-${pnl}-${Math.round(Math.abs(pnl) * 100)}`,
    tradeDate: date,
    closedAt: opts.closedAt ?? `${date}T12:00:00.000Z`,
    pnl,
    fees: opts.fees ?? 0,
    symbol: opts.symbol ?? 'ES',
    tags: opts.tags ?? [],
  };
}

/** Entrée journalière : symbole vide. */
function daily(date: string, pnl: number): AnalyticsTrade {
  return { id: `d-${date}`, tradeDate: date, closedAt: `${date}T12:00:00.000Z`, pnl, fees: 0, symbol: '', tags: [] };
}

describe('computeMetrics', () => {
  it('win rate, expectancy, profit factor et R moyen', () => {
    const trades = [
      t('2026-01-01', 400),
      t('2026-01-02', -200),
      t('2026-01-03', 200),
      t('2026-01-04', -100),
    ];
    const m = computeMetrics(trades);
    expect(m.entries).toBe(4);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(2);
    expect(m.winRate).toBe(50);
    expect(m.netPnl).toBe(300);
    expect(m.grossWin).toBe(600);
    expect(m.grossLoss).toBe(300);
    expect(m.avgWin).toBe(300);
    expect(m.avgLoss).toBe(150);
    expect(m.expectancy).toBe(75); // 300 / 4
    expect(m.profitFactor).toBe(2); // 600 / 300
    expect(m.avgR).toBe(0.5); // 75 / 150
  });

  it('déduit les frais du P&L', () => {
    const m = computeMetrics([t('2026-01-01', 100, { fees: 40 })]);
    expect(m.netPnl).toBe(60);
    expect(m.wins).toBe(1);
  });

  it('profitFactor null quand aucune perte', () => {
    const m = computeMetrics([t('2026-01-01', 100), t('2026-01-02', 50)]);
    expect(m.profitFactor).toBeNull();
    expect(m.winRate).toBe(100);
  });

  it('plus longues séries de gains et de pertes', () => {
    const trades = [
      t('2026-01-01', 10),
      t('2026-01-02', 10),
      t('2026-01-03', 10),
      t('2026-01-04', -5),
      t('2026-01-05', -5),
      t('2026-01-06', 10),
    ];
    const m = computeMetrics(trades);
    expect(m.maxWinStreak).toBe(3);
    expect(m.maxLossStreak).toBe(2);
  });
});

describe('ventilations', () => {
  it('par symbole exclut les entrées journalières', () => {
    const a = buildAnalytics({
      rules: STATIC_25K,
      startingBalance: 25_000,
      allTrades: [t('2026-01-01', 100, { symbol: 'ES' }), t('2026-01-02', -50, { symbol: 'NQ' }), daily('2026-01-03', 200)],
      range: { preset: 'all', from: '2026-01-01', to: '2026-01-31' },
    });
    const symbols = a.bySymbol.map((b) => b.key).sort();
    expect(symbols).toEqual(['ES', 'NQ']);
    // L'entrée journalière compte dans les métriques globales mais pas par symbole.
    expect(a.metrics.entries).toBe(3);
  });

  it('par heure exclut les entrées journalières', () => {
    const a = buildAnalytics({
      rules: STATIC_25K,
      startingBalance: 25_000,
      allTrades: [
        t('2026-01-01', 100, { closedAt: '2026-01-01T09:30:00.000Z' }),
        t('2026-01-01', -20, { closedAt: '2026-01-01T14:00:00.000Z' }),
        daily('2026-01-02', 200),
      ],
      range: { preset: 'all', from: '2026-01-01', to: '2026-01-31' },
    });
    expect(a.byHour.map((b) => b.key)).toEqual(['09', '14']);
  });

  it('par setup ventile sur les tags multiples', () => {
    const a = buildAnalytics({
      rules: STATIC_25K,
      startingBalance: 25_000,
      allTrades: [
        t('2026-01-01', 100, { tags: ['setup:breakout', 'emotion:confiant'] }),
        t('2026-01-02', -50, { tags: ['setup:breakout'] }),
        t('2026-01-03', 30, { tags: ['setup:pullback'] }),
      ],
      range: { preset: 'all', from: '2026-01-01', to: '2026-01-31' },
    });
    const breakout = a.bySetup.find((b) => b.key === 'setup:breakout');
    expect(breakout?.entries).toBe(2);
    expect(breakout?.netPnl).toBe(50);
    expect(a.byEmotion.find((b) => b.key === 'emotion:confiant')?.entries).toBe(1);
  });

  it('par jour de la semaine est ordonné lundi→dimanche', () => {
    // 2026-01-01 = jeudi, 2026-01-05 = lundi
    const a = buildAnalytics({
      rules: STATIC_25K,
      startingBalance: 25_000,
      allTrades: [t('2026-01-01', 10), t('2026-01-05', 20)],
      range: { preset: 'all', from: '2026-01-01', to: '2026-01-31' },
    });
    expect(a.byWeekday.map((b) => b.label)).toEqual(['Lundi', 'Jeudi']);
  });
});

describe('distribution', () => {
  it('chaque entrée tombe dans exactement une tranche', () => {
    const trades = [t('2026-01-01', 400), t('2026-01-02', -200), t('2026-01-03', 50), t('2026-01-04', -500)];
    const bins = buildDistribution(trades);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(trades.length);
  });
});

describe('buildEquityCurve', () => {
  it('STATIC : plancher constant = solde initial - drawdown', () => {
    const pts = buildEquityCurve(STATIC_25K, 25_000, [t('2026-01-01', 300), t('2026-01-02', -100)]);
    expect(pts.map((p) => p.floor)).toEqual([24_500, 24_500]);
    expect(pts.map((p) => p.equity)).toEqual([25_300, 25_200]);
  });

  it('TRAIL : le plancher monte avec le plus haut, puis se fige au capital', () => {
    const pts = buildEquityCurve(TRAIL_50K, 50_000, [t('2026-01-01', 1_000), t('2026-01-02', 2_000)]);
    // Jour 1 : high 51 000 → plancher 48 500
    expect(pts[0].floor).toBe(48_500);
    // Jour 2 : high 53 000 → plancher brut 50 500, figé au capital initial (lock at breakeven)
    expect(pts[1].floor).toBe(50_000);
    expect(pts[1].equity).toBe(53_000);
  });

  it('agrège les trades du même jour en un point', () => {
    const pts = buildEquityCurve(STATIC_25K, 25_000, [t('2026-01-01', 100), t('2026-01-01', 50)]);
    expect(pts).toHaveLength(1);
    expect(pts[0].equity).toBe(25_150);
  });
});

describe('buildAggregateAnalytics', () => {
  const ag = (accountId: string, accountLabel: string, date: string, pnl: number, opts: Partial<AnalyticsTrade> = {}): AggregateTrade => ({
    ...t(date, pnl, opts),
    accountId,
    accountLabel,
  });

  const trades: AggregateTrade[] = [
    ag('a', 'Apex 50K', '2026-01-01', 400, { symbol: 'ES' }),
    ag('a', 'Apex 50K', '2026-01-02', -100, { symbol: 'NQ' }),
    ag('b', 'Topstep 50K', '2026-01-02', 250, { symbol: 'ES' }),
    ag('b', 'Topstep 50K', '2026-01-03', -50, { symbol: 'ES' }),
  ];
  const range = { preset: 'all' as const, from: '2026-01-01', to: '2026-01-31' };

  it('agrège les métriques sur tous les comptes', () => {
    const a = buildAggregateAnalytics({ allTrades: trades, range });
    expect(a.accounts).toBe(2);
    expect(a.rangeEntries).toBe(4);
    expect(a.metrics.netPnl).toBe(500); // 400 - 100 + 250 - 50
    expect(a.metrics.wins).toBe(2);
    expect(a.metrics.losses).toBe(2);
  });

  it('ventile par compte avec les libellés', () => {
    const a = buildAggregateAnalytics({ allTrades: trades, range });
    const apex = a.byAccount.find((b) => b.label === 'Apex 50K');
    const topstep = a.byAccount.find((b) => b.label === 'Topstep 50K');
    expect(apex?.entries).toBe(2);
    expect(apex?.netPnl).toBe(300);
    expect(topstep?.netPnl).toBe(200);
  });

  it('courbe = P&L net cumulé (sans plancher)', () => {
    const a = buildAggregateAnalytics({ allTrades: trades, range });
    // 2026-01-01: +400 ; 01-02: +400-100+250=550 ; 01-03: 550-50=500
    expect(a.cumulative).toEqual([
      { date: '2026-01-01', pnl: 400 },
      { date: '2026-01-02', pnl: 550 },
      { date: '2026-01-03', pnl: 500 },
    ]);
  });

  it('respecte la période', () => {
    const a = buildAggregateAnalytics({ allTrades: trades, range: { preset: 'custom', from: '2026-01-02', to: '2026-01-02' } });
    expect(a.rangeEntries).toBe(2);
    expect(a.metrics.netPnl).toBe(150); // -100 + 250
  });
});

describe('buildCumulative', () => {
  it('agrège les trades du même jour', () => {
    const pts = buildCumulative([t('2026-01-01', 100), t('2026-01-01', 50), t('2026-01-02', -30)]);
    expect(pts).toEqual([{ date: '2026-01-01', pnl: 150 }, { date: '2026-01-02', pnl: 120 }]);
  });
});

describe('resolveRange', () => {
  const trades = [t('2025-11-10', 10), t('2026-01-15', 20)];
  it('mois en cours', () => {
    expect(resolveRange('month', '2026-01-20', trades)).toEqual({ preset: 'month', from: '2026-01-01', to: '2026-01-20' });
  });
  it('trimestre en cours', () => {
    expect(resolveRange('quarter', '2026-05-20', trades)).toEqual({ preset: 'quarter', from: '2026-04-01', to: '2026-05-20' });
  });
  it('depuis le début = premier trade', () => {
    expect(resolveRange('all', '2026-01-20', trades)).toEqual({ preset: 'all', from: '2025-11-10', to: '2026-01-20' });
  });
  it('personnalisé', () => {
    expect(resolveRange('custom', '2026-01-20', trades, '2026-01-01', '2026-01-10')).toEqual({
      preset: 'custom',
      from: '2026-01-01',
      to: '2026-01-10',
    });
  });
});
